---
name: bump
description: Moves a plugin's version through scripts/version.mjs, records the change in CHANGELOG.md, and revalidates. Use when releasing or when CI reports that a changed plugin was not bumped.
disable-model-invocation: true
allowed-tools: Bash(node:*) Bash(git:*) Bash(claude:*) Read Edit Grep Glob
---

# Bumping a plugin version

Arguments: `$ARGUMENTS` — the plugin name and the step
(`major`, `minor`, `patch`, or an explicit `X.Y.Z`). Default plugin is
`cm-agent`.

## 1. Choose the step from what actually changed

Look at the diff first — `git diff origin/main...HEAD --stat` — then apply this
repo's policy, which is stricter than a default semver reading:

| Change | Step |
| --- | --- |
| A skill was added | **minor** |
| An existing skill was rewritten, renamed, or removed | **major** |
| Wording, a reference file, or a script was fixed | **patch** |

Major for a rewrite is not optional. Installed agents route on skill
descriptions, so changing one changes behavior for everyone who already has it.
CI checks only that a version moved, not that it moved by the right amount — this
call is yours, so state your reasoning before running anything.

## 2. Bump

```bash
node scripts/version.mjs <plugin> <step>
```

Never hand-edit the numbers. The plugin version is the same string in two files,
and one of those files also holds the catalog version as that same string, so a
find-and-replace hits the wrong one.

The script reads the current version from `plugin.json` (the one that wins at
install), writes both plugin fields, steps the catalog by the same amount, and
reads the files back to confirm. Both outputs are built and validated in memory
first, so a failed bump leaves neither file changed.

Two behaviors worth expecting:

- An explicit `X.Y.Z` names the **plugin's** version. The catalog gets a patch
  bump instead, because assigning it directly could move it backwards.
- Versions only move forward. A target that does not increase is rejected, and
  `--check-bumped` treats a downgrade as a failure. A deliberate rollback means
  editing both files by hand — ask before doing that.

## 3. Record it

Add an entry to `CHANGELOG.md` under `## [Unreleased]`, Keep a Changelog format.
Describe the user-visible change, not the file that moved.

## 4. Verify

```bash
claude plugin validate . --strict
node scripts/version.mjs --self-test
node scripts/version.mjs --check-bumped origin/main
```

The first catches drift between `plugin.json` and the marketplace entry. The
last is the exact CI gate.

## Releasing

Merging to `main` is what ships — both `/plugin marketplace add` and
`npx skills add` read the default branch. Tags are for humans reading history:

```bash
git tag -a v<version> -m "<plugin> <version>" && git push --tags
```

Ask before pushing tags.
