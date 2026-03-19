import assert from "node:assert/strict";
import { homedir } from "node:os";
import { describe, it } from "node:test";
import type { Config } from "./sync-collections.js";
import { buildGlob, expandHome, parseCollectionNames } from "./sync-collections.js";

describe("expandHome", () => {
  it("replaces ~ with home directory", () => {
    assert.equal(expandHome("~/foo/bar"), `${homedir()}/foo/bar`);
  });

  it("leaves absolute paths unchanged", () => {
    assert.equal(expandHome("/usr/local/bin"), "/usr/local/bin");
  });

  it("only replaces leading ~", () => {
    assert.equal(expandHome("/home/~user"), "/home/~user");
  });
});

describe("buildGlob", () => {
  const masks: Config["masks"] = {
    docs: ["md", "sh"],
    config: ["yaml", "yml", "json", "toml"],
    python: ["py"],
    typescript: ["ts", "tsx", "js"],
  };

  it("builds glob from single mask", () => {
    assert.equal(buildGlob(["python"], masks), "**/*.{py}");
  });

  it("merges multiple masks and sorts extensions", () => {
    const glob = buildGlob(["python", "config"], masks);
    assert.equal(glob, "**/*.{json,py,toml,yaml,yml}");
  });

  it("deduplicates extensions across masks", () => {
    const overlapping: Config["masks"] = { ...masks, extra: ["py", "ts"] };
    const glob = buildGlob(["python", "extra"], overlapping);
    assert.equal(glob, "**/*.{py,ts}");
  });

  it("handles empty mask list", () => {
    assert.equal(buildGlob([], masks), "**/*.{}");
  });

  it("skips unknown masks", () => {
    const glob = buildGlob(["python", "nonexistent"], masks);
    assert.equal(glob, "**/*.{py}");
  });

  it("handles all masks combined", () => {
    const glob = buildGlob(["docs", "config", "python", "typescript"], masks);
    assert.equal(glob, "**/*.{js,json,md,py,sh,toml,ts,tsx,yaml,yml}");
  });
});

describe("parseCollectionNames", () => {
  it("extracts names from collection list output", () => {
    const output = [
      "Collections (3):",
      "",
      "infra (qmd://infra/)",
      "  Pattern:  **/*.{yaml,yml}",
      "  Files:    100",
      "  Updated:  1d ago",
      "",
      "backstage (qmd://backstage/)",
      "  Pattern:  **/*.{ts,tsx}",
      "  Files:    50",
      "  Updated:  2d ago",
      "",
      "cem (qmd://cem/)",
      "  Pattern:  **/*.{py}",
      "  Files:    10",
      "  Updated:  3d ago",
    ].join("\n");
    assert.deepEqual(parseCollectionNames(output), ["infra", "backstage", "cem"]);
  });

  it("returns empty array for empty output", () => {
    assert.deepEqual(parseCollectionNames(""), []);
  });

  it("handles names with hyphens", () => {
    const output = "govcloud-data-platform (qmd://govcloud-data-platform/)\n  Pattern:  **/*.{py}";
    assert.deepEqual(parseCollectionNames(output), ["govcloud-data-platform"]);
  });
});
