---
name: verify
description: Runs every check this repository has - the strict plugin validation, the universal-CLI dry run, and both script self-tests - and reports exactly which ones failed. Use before opening a pull request, after editing any SKILL.md or manifest, or whenever asked to test, verify, or check this repo, since there is no package.json and no npm test to fall back on.
allowed-tools: Bash(claude:*) Bash(npx:*) Bash(node:*) Read Grep Glob
---

# Verifying the repository

This repo has no `package.json` and no test runner. These four commands are the
entire gate, and CI runs the same set.

## Run, in this order

From the repo root. Do not stop at the first failure — run all four, then report
together.

```bash
claude plugin validate . --strict
npx skills add ./ -l
node scripts/version.mjs --self-test
node plugins/cm-agent/skills/writing-publish-specs/scripts/validate-spec.mjs --self-test
```

1. **`claude plugin validate . --strict`** — JSON syntax, required manifest
   fields, duplicate plugin names, and version drift between a plugin's
   `plugin.json` and its `marketplace.json` entry.
2. **`npx skills add ./ -l`** — lists what the universal CLI would install,
   without installing. Needs network.
3. **`node scripts/version.mjs --self-test`** — 29 cases.
4. **`node plugins/.../validate-spec.mjs --self-test`** — 11 cases.

## Then close the two gaps CI leaves open

Neither the validator nor the skills CLI fails on a `SKILL.md` with a missing or
empty `name`, so check it directly:

```bash
for f in plugins/*/skills/*/SKILL.md; do
  dir=$(basename "$(dirname "$f")")
  nm=$(sed -n '/^---$/,/^---$/p' "$f" | sed -n 's/^name:[[:space:]]*//p' | head -1)
  [ "$nm" = "$dir" ] || echo "MISMATCH: $f has name='$nm', directory is '$dir'"
done
```

Also confirm every `references/` path named in a `SKILL.md` exists and is exactly
one level deep — a reference pointing at another reference gets partially read.

## If a pull request is open or about to be

Add the version guard. It is a separate CI job:

```bash
node scripts/version.mjs --check-bumped origin/main
```

It only checks that a version *moved*, not that it moved by the right amount.
If a skill was rewritten, renamed, or removed, the bump must be **major** — say
so in the report even when the command passes.

## Report

State each command and whether it passed or failed. Quote the actual failure
output; never summarize a failure as "minor". If a command could not run (no
network for `npx`), say that plainly rather than counting it as a pass.
