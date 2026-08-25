---
name: add-skill
description: Scaffolds a new Agent Skill in this marketplace with the exact frontmatter, directory layout, version bump, and CHANGELOG entry the repo requires. Use when adding a skill to an existing plugin or standing up a whole new plugin.
disable-model-invocation: true
allowed-tools: Bash(node:*) Bash(mkdir:*) Bash(claude:*) Bash(git:*) Read Write Edit Glob Grep
---

# Adding a skill

Arguments: `$ARGUMENTS` — the skill name, optionally followed by the plugin it
belongs to (defaults to `cm-agent`).

If no name was given, ask for one plus a one-line summary of what the skill does
and when an agent should reach for it. Do not invent either.

## 1. Check the name

Lowercase kebab-case, 64 characters or fewer, and it must not contain `claude`
or `anthropic`. The directory name and the frontmatter `name` must be identical
— nothing in CI catches a mismatch.

## 2. If this needs a new plugin

Skip to step 3 when adding to an existing plugin.

```bash
mkdir -p plugins/<plugin>/{.claude-plugin,skills}
```

Write `plugins/<plugin>/.claude-plugin/plugin.json` modelled on
`plugins/cm-agent/.claude-plugin/plugin.json`: `name`, `version`,
`description`, `author{}`, `homepage`, `repository`, `license`, `keywords[]`,
and `"skills": ["./skills/"]`. Keep `keywords` on a single line — `version.mjs`
patches this file textually and depends on that shape.

Then add an entry to the `plugins` array in `.claude-plugin/marketplace.json`
with `"source": "./plugins/<plugin>"` and a `version` byte-identical to the one
in `plugin.json`. Drift fails validation, and `plugin.json` wins at install
time, so a mismatch ships the wrong version quietly.

## 3. Create the skill

```bash
mkdir -p plugins/<plugin>/skills/<name>
```

Write `SKILL.md`:

```yaml
---
name: <name>
description: <third person; what it does AND when to use it>
license: MIT
metadata:
  author: shawn-sandy
  version: "0.1.0"
allowed-tools: Read Write Edit Glob Grep
---
```

`allowed-tools` is a space-separated string, not a YAML list. Scope Bash entries
(`Bash(node:*)`). Grant only what the skill actually needs.

The `description` is how an agent decides to load the skill — it is the
highest-leverage line in the file. Third person, and it must cover both the what
and the when. Compare against the four existing skills before settling on it.

Body rules:

- Under 500 lines. The existing skills run 79–101.
- Detail goes in `references/`, executables in `scripts/`, templates in
  `assets/`.
- References are exactly one level deep from `SKILL.md`. A reference that points
  at another reference gets partially read.
- Match the surrounding prose style: plain Markdown wrapped at roughly 80
  columns. There is no formatter — the repo is deliberately dependency-free.

## 4. Bump and record

Adding a skill is a **minor** bump on its plugin:

```bash
node scripts/version.mjs <plugin> minor
```

Never hand-edit versions. Then add a `CHANGELOG.md` entry under `## [Unreleased]`
in Keep a Changelog format.

## 5. Verify

Run the `/verify` skill, or at minimum:

```bash
claude plugin validate . --strict
node scripts/version.mjs --self-test
```

Then confirm by hand that the frontmatter `name` matches the directory — the
validator does not check this.
