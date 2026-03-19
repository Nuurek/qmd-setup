import assert from "node:assert/strict";
import * as realFs from "node:fs";
import { homedir } from "node:os";
import { afterEach, describe, it, mock } from "node:test";
import type { Collection } from "./sync-collections.js";

// --- Mock setup ---
// Proxy existsSync through a mutable reference so tests can swap behaviour.
let existsFn: (p: string) => boolean = realFs.existsSync;

mock.module("node:fs", {
  namedExports: { ...realFs, existsSync: (p: string) => existsFn(p) },
});

// Import AFTER mock — the module binds to our proxied existsSync.
const { buildPlistXml, extractWatchPaths } = await import("./regen-plist.js");

afterEach(() => {
  existsFn = realFs.existsSync;
});

// --- Pure function tests ---

describe("buildPlistXml", () => {
  it("generates valid plist with watch paths", () => {
    const xml = buildPlistXml(["/repo1/.git/refs", "/repo2/.git/refs"], "/Users/test");
    assert.ok(xml.includes('<?xml version="1.0"'));
    assert.ok(xml.includes("<string>/repo1/.git/refs</string>"));
    assert.ok(xml.includes("<string>/repo2/.git/refs</string>"));
  });

  it("uses home for script and log paths", () => {
    const xml = buildPlistXml(["/r/.git/refs"], "/home/me");
    assert.ok(xml.includes("<string>/home/me/.local/bin/qmd-auto-embed.sh</string>"));
    assert.ok(xml.includes("<string>/home/me/.local/log/qmd-auto-embed.log</string>"));
  });

  it("sets label to com.qmd.auto-embed", () => {
    const xml = buildPlistXml([], "/home/me");
    assert.ok(xml.includes("<string>com.qmd.auto-embed</string>"));
  });

  it("defaults throttle interval to 30", () => {
    const xml = buildPlistXml([], "/home/me");
    assert.ok(xml.includes("<integer>30</integer>"));
  });

  it("accepts custom throttle interval", () => {
    const xml = buildPlistXml([], "/home/me", 60);
    assert.ok(xml.includes("<integer>60</integer>"));
    assert.ok(!xml.includes("<integer>30</integer>"));
  });

  it("handles single watch path", () => {
    const xml = buildPlistXml(["/only/.git/refs"], "/home/me");
    const matches = xml.match(/<string>\/only\/.git\/refs<\/string>/g);
    assert.equal(matches?.length, 1);
  });
});

// --- Side-effect tests (patched fs) ---

describe("extractWatchPaths", () => {
  it("returns empty array for empty collections", () => {
    assert.deepEqual(extractWatchPaths([]), []);
  });

  it("skips paths where .git/refs does not exist", () => {
    existsFn = () => false;
    const collections: Collection[] = [{ path: "/repos/myrepo", masks: ["docs"] }];
    assert.deepEqual(extractWatchPaths(collections), []);
  });

  it("includes paths where .git/refs exists", () => {
    existsFn = (p) => p === "/repos/myrepo" || p === "/repos/myrepo/.git/refs";
    const collections: Collection[] = [{ path: "/repos/myrepo", masks: ["docs"] }];
    assert.deepEqual(extractWatchPaths(collections), ["/repos/myrepo/.git/refs"]);
  });

  it("expands ~ in paths", () => {
    const home = homedir();
    existsFn = (p) => p === `${home}/repos/myrepo` || p === `${home}/repos/myrepo/.git/refs`;
    const collections: Collection[] = [{ path: "~/repos/myrepo", masks: ["docs"] }];
    assert.deepEqual(extractWatchPaths(collections), [`${home}/repos/myrepo/.git/refs`]);
  });

  it("filters mixed collections", () => {
    existsFn = (p) => p === "/repos/a" || p === "/repos/a/.git/refs" || p === "/repos/b";
    const collections: Collection[] = [
      { path: "/repos/a", masks: ["docs"] },
      { path: "/repos/b", masks: ["docs"] },
    ];
    assert.deepEqual(extractWatchPaths(collections), ["/repos/a/.git/refs"]);
  });

  it("includes multiple repos", () => {
    existsFn = () => true;
    const collections: Collection[] = [
      { path: "/repos/a", masks: ["docs"] },
      { path: "/repos/b", masks: ["docs"] },
    ];
    const result = extractWatchPaths(collections);
    assert.equal(result.length, 2);
    assert.ok(result.includes("/repos/a/.git/refs"));
    assert.ok(result.includes("/repos/b/.git/refs"));
  });
});
