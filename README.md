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
├── CHANGELOG.md
├── .github/
│   └── workflows/ci.yml          # validation + version guard
├── .claude-plugin/
│   └── marketplace.json          # marketplace catalog
├── scripts/
│   └── version.mjs               # lockstep version bumps
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
4. Keep the `version` identical in both files — validation fails when they drift. Use `node scripts/version.mjs <name> <step>` for every later bump. See [Versioning](#versioning).

## Versioning

Three version numbers, two rules.

| Number | Lives in | Moves when |
|--------|----------|------------|
| Plugin | `plugins/<name>/.claude-plugin/plugin.json` **and** its entry in `marketplace.json` | That plugin changes |
| Catalog | top level of `.claude-plugin/marketplace.json` | Any plugin version changes, or a plugin is added or removed |
| Skill | `metadata.version` in each `SKILL.md` | That skill changes — independent of the plugin |

**Rule one:** the two plugin numbers must be identical. They are the same version recorded twice, and `claude plugin validate . --strict` fails when they drift. At install time `plugin.json` wins and the marketplace entry is silently ignored, so drift ships the wrong version quietly.

**Rule two:** [semver](https://semver.org/spec/v2.0.0.html). Adding a skill is a **minor** bump. Rewriting what an existing skill does, renaming it, or removing it is **major** — installed agents route on skill descriptions, so changing one changes behavior for everyone who already has it. Fixing wording, references, or a script is **patch**.

Skills version on their own because they install individually — `npx skills add ./ --skill humanize-text` takes one skill without the plugin around it.

### Bumping

Do not hand-edit the numbers. Both plugin versions are the string `"0.2.0"` in two different files, and one of them shares that string with the catalog version in the same file — a find-and-replace hits the wrong one.

```bash
node scripts/version.mjs cms-publish minor
```

Takes `major`, `minor`, `patch`, or an explicit `X.Y.Z`. It reads the current version from `plugin.json` (the one that wins at install), writes both plugin fields, steps the catalog, and reads the files back to confirm the write landed. Then add a `CHANGELOG.md` entry and validate.

Versions only move forward: an explicit target that does not increase on the current version is rejected, and `--check-bumped` treats a downgrade as a failure rather than a bump. A deliberate rollback means editing both files by hand.

A relative step moves the catalog by the same amount. An explicit `X.Y.Z` names the *plugin's* version, not the catalog's, so the catalog gets a patch bump instead — assigning it directly could move it backwards when the catalog is ahead. Both output files are built and validated in memory before either is written, so a failed bump leaves neither changed.

Forgetting the bump is the common failure, so CI checks it — see [Continuous integration](#continuous-integration). To check before pushing:

```bash
node scripts/version.mjs --check-bumped origin/main
```

Every plugin with changes since the base ref must carry a new version, and the catalog version must move whenever any plugin changes, is added, or is removed. Untouched plugins and brand-new ones pass.

The script carries its own tests:

```bash
node scripts/version.mjs --self-test
```

Twenty-nine cases — bump arithmetic in both directions, rejected junk input, the catalog-target and catalog-verdict rules, and the two guards that keep `plugin.json` formatting intact.

### Releasing

Bump, changelog, validate, commit, then tag:

```bash
git tag -a v0.2.0 -m "cms-publish 0.2.0" && git push --tags
```

Tags are for humans reading history. `/plugin marketplace add` and `npx skills add` both read the default branch, not tags, so a merge to `main` is what actually ships.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and on pushes to `main`. Two jobs:

**`validate`** — `claude plugin validate . --strict`, then each script's own self-test. The validator catches malformed JSON, missing required fields, and version drift between a plugin entry and its `plugin.json`.

**`version`** — pull requests only. Runs `--check-bumped` against the PR base, so a PR that edits a plugin without bumping its version fails, as does one that changes a plugin without moving the catalog version.

CI installs no project dependencies. The self-tests run directly through `node`, and `claude plugin validate` comes from `npx` and needs no credentials, so the workflow needs no secrets.

Two known gaps, both worth knowing before you trust a green check:

- Neither `claude plugin validate --strict` nor `npx skills add ./ -l` fails on a `SKILL.md` with an empty or missing `name`. Skill frontmatter is not linted by anything here.
- The version job checks that a number moved, not that it moved by the right amount. Choosing major over minor is still a judgment call.

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
