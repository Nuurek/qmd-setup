# qmd-setup

CLI tool that manages [qmd](https://github.com/tobilu/qmd) collections, launchd auto-indexing, and [Claude Code](https://docs.anthropic.com/en/docs/claude-code) integration.

## What it does

- **Syncs collections** — reads a YAML config and registers repos with qmd
- **Auto-indexes** — installs a macOS launchd agent that re-indexes and re-embeds when `.git/refs` change in any watched repo
- **Claude Code integration** — symlinks rules and skills into `~/.claude/` and merges the qmd MCP server into `~/.claude.json`

## Prerequisites

- **Node.js >= 22**
- **npm** or **bun**
- **qmd** (installed automatically if missing)
- macOS (launchd agent is macOS-only)

## Install

```bash
git clone <repo-url> && cd qmd-setup
./setup
```

The `setup` script:
1. Finds a suitable Node.js (>= 22)
2. Installs `qmd` globally if not present
3. Installs npm dependencies and compiles TypeScript
4. Runs `npm link` to make `qmd-setup` available on PATH
5. Executes the full setup flow (symlinks, MCP config, collection sync, launchd agent)

## Configuration

Config lives at `~/.config/qmd/config.yaml` (or `$XDG_CONFIG_HOME/qmd/config.yaml`). See [config.example.yaml](config.example.yaml) for the full format.

```yaml
masks:
  docs: [md, sh]
  python: [py]
  config: [yaml, yml, json, toml]

launchd:
  throttle_interval: 30  # seconds between re-index triggers

collections:
  - path: ~/Repositories/my-project
    name: my-project
    masks: [python, config, docs]
```

**masks** — named file-extension profiles, combined into glob patterns for qmd.

**collections** — repos to index. `path` is required (`~` expanded to `$HOME`), `name` defaults to the directory basename, `masks` selects which file types to include.

Override config path with `-c` / `--config` on any command.

## Usage

```bash
# Full setup (symlinks, MCP config, sync, launchd)
qmd-setup

# Sync collections from config into qmd
qmd-setup sync

# Sync and remove collections not in config
qmd-setup sync --remove

# Regenerate launchd plist from config
qmd-setup regen-plist

# Use a custom config file
qmd-setup -c /path/to/config.yaml sync
```

## How auto-indexing works

The setup installs a macOS launchd agent (`com.qmd.auto-embed`) that watches `.git/refs/` in every configured collection. When git refs change (commits, branch switches, fetches), launchd triggers `qmd-auto-embed.sh`, which runs:

```
qmd update   # re-index changed collections
qmd embed    # regenerate vector embeddings
```

Triggers are throttled (default: 30s) to avoid excessive re-indexing. Logs go to `~/.local/log/qmd-auto-embed.log`.

## Claude Code integration

The setup flow:
- Symlinks `rules/` → `~/.claude/rules/` (global rules for all projects)
- Symlinks `skills/` → `~/.claude/skills/` (slash commands: `/qmd-update`, `/qmd-add`)
- Merges the qmd MCP server config into `~/.claude.json`

This gives Claude Code automatic access to qmd search across all indexed repositories.

## Development

```bash
npm run build     # compile TypeScript
npm test          # compile + run tests
npm run lint      # biome check
npm run format    # biome format
```

Tests use Node's built-in `node:test` runner with `--experimental-test-module-mocks`.
