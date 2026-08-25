# Agentic CMS

Agent skills that figure out which CMS a project publishes to, write a machine-readable spec for it, and publish content through that spec.

The skills do not assume a CMS. They detect one — Astro content collections, WordPress, Sanity, Payload, Ghost, Hugo, and others — and record what they find in a `cms-publish.json` file at the project root. Everything downstream reads that file instead of re-deriving the CMS every time.

Built to the [Agent Skills specification](https://agentskills.io/specification) and the [Claude Code plugin marketplace spec](https://code.claude.com/docs/en/plugin-marketplaces), so the same skills install through either toolchain.

## Install

### Universal (any agent)

```bash
npx skills install shawn-sandy/agentic-cms
```

Installs into whichever coding agents the CLI finds on your machine. Add `-g` for user-level instead of project-level, and `--all` to skip the prompts.

### Claude Code plugin

```bash
/plugin marketplace add shawn-sandy/agentic-cms
```

```bash
/plugin install cms-publish@agentic-cms
```

Both routes read the same `skills/` directories. The `skills` CLI discovers them through `.claude-plugin/marketplace.json`, so there is one copy of every skill and no duplicated tree to keep in sync.

## The four skills

The first three form a loop. Each one hands off to the next, and each is useful on its own.

| Skill | Does | Produces |
|-------|------|----------|
| `detecting-cms` | Inspects dependencies, config files, content directories, and env var names | A report: CMS, content locations, transport, auth |
| `writing-publish-specs` | Turns that report into a spec and validates it | `cms-publish.json` at the project root |
| `publishing-content` | Maps a draft onto the spec, dry-runs, confirms, publishes | Published content, plus its URL or ID |
| `humanize-text` | Scans a draft for AI writing tells and rewrites them out | Humanized text, plus a `HUMANIZE REPORT` of findings |

You do not invoke them by name. Ask your agent "what CMS does this project use?", "publish this draft", or "make this sound less like AI" and the descriptions route the request.

`humanize-text` is independent of the spec — it edits prose and never touches `cms-publish.json`. Run it on a draft before publishing, or on any text at all.

### The spec

`cms-publish.json` is the contract. Four keys are required:

```json
{
  "cms": "astro-content-collections",
  "transport": { "type": "git-commit", "branch": "main" },
  "contentTypes": [
    {
      "name": "blog",
      "path": "src/content/blog",
      "format": "mdx",
      "fields": [
        { "name": "title", "type": "string", "required": true },
        { "name": "pubDate", "type": "date", "required": true }
      ]
    }
  ]
}
```

Four transports cover the field: `git-commit` for file-based sites, `rest` for HTTP APIs, `sdk` for first-party clients, `cli` for command-line tools.

`auth.envVars` holds variable **names**, never values — the file is committed. Full field reference: [spec-format.md](plugins/cms-publish/skills/writing-publish-specs/references/spec-format.md).

### Validating a spec

Zero dependencies, Node 18+:

```bash
node plugins/cms-publish/skills/writing-publish-specs/scripts/validate-spec.mjs cms-publish.json
```

Exit 0 is valid. Exit 1 prints one line per problem, each naming the exact path (`contentTypes[0].fields[2].type`). The validator carries its own tests:

```bash
node plugins/cms-publish/skills/writing-publish-specs/scripts/validate-spec.mjs --self-test
```

Eleven cases — one spec that must pass and ten that must be rejected.

## Repository layout

```
agentic-cms/
├── .claude-plugin/
│   └── marketplace.json          # marketplace catalog
└── plugins/
    └── cms-publish/
        ├── .claude-plugin/
        │   └── plugin.json       # plugin manifest
        └── skills/
            ├── detecting-cms/
            │   ├── SKILL.md
            │   └── references/detection-signals.md
            ├── writing-publish-specs/
            │   ├── SKILL.md
            │   ├── references/spec-format.md
            │   ├── scripts/validate-spec.mjs
            │   └── assets/publish.spec.example.json
            ├── publishing-content/
            │   ├── SKILL.md
            │   └── references/publish-transports.md
            └── humanize-text/
                ├── SKILL.md
                └── references/ai-writing-signs.md
```

The multi-plugin layout means a second plugin drops in beside `cms-publish` without moving any existing skill.

## Adding a skill

1. `mkdir -p plugins/cms-publish/skills/<name>` — the directory name must equal the `name` in frontmatter.
2. Write `SKILL.md` with `name` and `description` frontmatter. Names are lowercase kebab-case, max 64 characters, and cannot contain `claude` or `anthropic`.
3. Write the description in third person, covering both what the skill does **and** when to use it. This is how the agent decides to load it — it is the highest-leverage line in the file.
4. Keep the body under 500 lines. Push detail into `references/`, executables into `scripts/`, templates into `assets/`.
5. Keep references one level deep from `SKILL.md`. A reference that points at another reference gets partially read.
6. Validate.

## Adding a plugin

1. `mkdir -p plugins/<name>/{.claude-plugin,skills}`
2. Write `plugins/<name>/.claude-plugin/plugin.json`.
3. Add an entry to the `plugins` array in `.claude-plugin/marketplace.json` with `"source": "./plugins/<name>"`.
4. Keep the `version` identical in both files — validation fails when they drift.

## Validating the repository

```bash
claude plugin validate . --strict
```

Checks JSON syntax, required fields, duplicate plugin names, version consistency, and every `SKILL.md` in the tree.

```bash
npx skills add ./ -l
```

Lists what the universal CLI would install, without installing it. Both should be run before opening a pull request.

## License

MIT
