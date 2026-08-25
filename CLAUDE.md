# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`cm-agent` is a Claude Code plugin marketplace and Agent Skills repository. It
ships skills written as Markdown — there is no application to build or run.
Skills live at `plugins/<plugin>/skills/<skill>/SKILL.md`.

The repository, the marketplace, and the single plugin are all named `cm-agent`,
so installs read `/plugin install cm-agent@cm-agent`. Separately,
`cms-publish.json` is the spec file written into a consumer project; it is not
related to the old plugin name and must not be renamed with it.

The local checkout directory may still be `agent-cm`. That name is incidental —
it appears in no manifest, and `shawn-sandy/agent-cm` reaches GitHub only
through a rename redirect.

## Commands

There is no `package.json`, no lockfile, and no task runner. `npm test`,
`npm run build`, and `npm run lint` do not exist. Run these from the repo root:

```bash
claude plugin validate . --strict                     # primary gate
npx skills add ./ -l                                  # dry-run install list
node scripts/version.mjs --self-test                  # 29 cases
node plugins/cm-agent/skills/writing-publish-specs/scripts/validate-spec.mjs --self-test  # 11 cases
node scripts/version.mjs --check-bumped origin/main   # the PR version guard
```

Run all of them before opening a pull request; CI runs the same set. Use the
local `claude` binary for validation — CI uses `npx --yes @anthropic-ai/claude-code`.

Scripts are zero-dependency ES modules on Node 18+. Never add a third-party
import; nothing in this repo can resolve one.

## Versioning

Never hand-edit a version. Use:

```bash
node scripts/version.mjs <plugin> <major|minor|patch|X.Y.Z>
```

The plugin version is the same string in two files, and one of those files also
holds the catalog version as the same string — a find-and-replace hits the wrong
one.

- **Plugin version** lives in `plugins/<name>/.claude-plugin/plugin.json` *and*
  in that plugin's entry in `.claude-plugin/marketplace.json`. The two must be
  identical. Validation fails on drift, and `plugin.json` wins at install time,
  so drift ships the wrong version silently.
- **Catalog version** is the top-level `version` in `marketplace.json`.
- **Skill version** is `metadata.version` in each `SKILL.md`. Moved by hand, and
  independent of the plugin — skills install individually via
  `npx skills add ./ --skill <name>`.

Semver policy here is stricter than the default reading: adding a skill is
**minor**; rewriting, renaming, or removing an existing skill is **major**
(installed agents route on skill descriptions, so changing one changes behavior
for everyone who already has it); wording, reference, and script fixes are
**patch**. Versions only move forward.

An explicit `X.Y.Z` names the *plugin's* version — the catalog then takes a patch
bump, not that value. After any bump, add a `CHANGELOG.md` entry (Keep a
Changelog format), then validate.

## Skill conventions

- The skill's directory name must equal the `name` in its frontmatter.
- Names are lowercase kebab-case, max 64 characters, and must not contain
  `claude` or `anthropic`.
- `description` is written in third person and states both what the skill does
  **and** when to use it. Agents route on this line; it is the
  highest-leverage line in the file.
- Frontmatter shape used by every skill here:

  ```yaml
  name: <matches the directory name>
  description: <third person, what it does and when to use it>
  license: MIT
  metadata:
    author: shawn-sandy
    version: "0.1.0"
  allowed-tools: Read Write Edit Glob Grep
  ```

  `allowed-tools` is a space-separated string, not a YAML list. Scope Bash
  entries: `Bash(node:*)`, `Bash(git:*)`.
- Keep the body under 500 lines. Detail goes in `references/`, executables in
  `scripts/`, templates in `assets/`.
- References must be exactly one level deep from `SKILL.md`. A reference that
  points at another reference gets partially read.

## Adding a plugin

`mkdir -p plugins/<name>/{.claude-plugin,skills}`, write
`plugins/<name>/.claude-plugin/plugin.json`, then add an entry to the `plugins`
array in `.claude-plugin/marketplace.json` with `"source": "./plugins/<name>"`
and a `version` identical to the one in `plugin.json`.

## Gotchas

- Never reformat `plugins/*/.claude-plugin/plugin.json`. Its `keywords` array is
  deliberately on one line — `version.mjs` patches the file textually to
  preserve that, and throws if a second `"version"` key ever appears in it.
- There is no formatter or linter, on purpose: the repo stays dependency-free.
  Match the surrounding style by hand — Markdown wrapped at roughly 80 columns,
  JavaScript single-quoted, 2-space indent, semicolons.
- CI does not lint `SKILL.md` frontmatter. `claude plugin validate --strict`
  passes a `SKILL.md` with an empty or missing `name`. Check it yourself.
- The version CI job checks that a version moved, not that it moved by the right
  amount. Major-versus-minor is still a judgment call.
- Any CI checkout needs `fetch-depth: 0` — `--check-bumped` runs `git merge-base`
  and fails on a shallow clone.

## Releasing

Merging to `main` is what ships: both `/plugin marketplace add` and
`npx skills add` read the default branch. Tags (`git tag -a v0.2.0`) are for
humans reading history only.
