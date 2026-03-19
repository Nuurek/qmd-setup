# qmd — Local codebase search index

## Rule: always use qmd before reading files

Before reading files or exploring directories, always use qmd to search for information in local projects.

Available tools (via MCP):
- `qmd search "query"` — fast keyword search (BM25)
- `qmd query "query"` — hybrid search with reranking (best quality)
- `qmd vsearch "query"` — semantic vector search
- `qmd get <file>` — retrieve a specific document

Use `search` for quick lookups and `query` for complex questions.
Use Read/Glob/Grep only if qmd doesn't return enough results.

## Maintenance

- `qmd update` — re-index all collections after code changes
- `qmd update --pull` — git pull first, then re-index
- `qmd embed` — regenerate vector embeddings (needed after updates for vsearch/query)
