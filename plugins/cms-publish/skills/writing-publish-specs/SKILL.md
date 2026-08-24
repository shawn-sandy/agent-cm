---
name: writing-publish-specs
description: Creates or updates cms-publish.json, a machine-readable spec describing a project's CMS, content types, fields, authentication, and publish transport, then validates it with a bundled zero-dependency script. Use after detecting a CMS, when a project has no publishing spec, when content types or fields have changed, or when a publish attempt failed on a missing or wrong field.
license: MIT
compatibility: Requires Node 18+ to run the validator
metadata:
  author: shawn-sandy
  version: "0.1.0"
allowed-tools: Read Write Edit Glob Grep Bash(node:*) Bash(ls:*) Bash(cat:*)
---

# Writing a publish spec

`cms-publish.json` lives at the target project's root. It is the contract every publish depends on: one file that says what the CMS accepts, so publishing never has to re-derive it.

## Workflow

```
Spec Progress:
- [ ] Step 1: Get the CMS facts
- [ ] Step 2: Take fields from the authoritative source
- [ ] Step 3: Draft cms-publish.json
- [ ] Step 4: Validate
- [ ] Step 5: Fix and re-validate until clean
```

**Step 1 — Get the CMS facts.** If detection has not run, run the **detecting-cms** skill first. You need the CMS, where content lives, the transport, and the auth env var names before you can write anything.

**Step 2 — Take fields from the authoritative source.** In priority order:

1. **A schema file** — `src/content.config.ts` (Astro Zod), `payload.config.ts`, `schemaTypes/`, `src/api/*/content-types/`. Exact types, exact required flags. Use this whenever it exists.
2. **The CMS API** — `/wp-json/wp/v2/types`, a GraphQL introspection query. Authoritative but needs credentials.
3. **Existing content** — read 3-5 real documents and take the union of their frontmatter. A field present in every document is required; a field present in some is optional.

Never invent fields. A field in the spec that the CMS rejects fails at publish time, and by then the draft is already written.

**Step 3 — Draft the spec.** Copy [assets/publish.spec.example.json](assets/publish.spec.example.json) and edit it. Field-by-field meanings are in [references/spec-format.md](references/spec-format.md).

Record **env var names only** under `auth.envVars`. Never write a token, password, or key into this file — it is committed to the repository.

**Step 4 — Validate.**

```bash
node scripts/validate-spec.mjs cms-publish.json
```

Exit 0 means valid. Exit 1 prints one line per problem, each naming the exact path (`contentTypes[0].fields[2].type`).

**Step 5 — Fix and re-validate.** Repeat step 4 until it exits 0. Do not hand the spec to the publishing skill while it still errors.

Warnings do not block. Read them anyway: "no required fields" almost always means the field list was never checked against the CMS, and an unset env var means publishing will fail even though the spec is fine.

## Minimum viable spec

Four keys are required — `cms`, `transport`, `contentTypes`, and per-type `fields`. Everything else is optional:

```json
{
  "cms": "wordpress",
  "transport": { "type": "rest", "baseUrl": "https://example.com/wp-json/wp/v2" },
  "auth": { "type": "basic", "envVars": ["WP_USER", "WP_APP_PASSWORD"] },
  "contentTypes": [
    {
      "name": "posts",
      "resource": "posts",
      "fields": [
        { "name": "title", "type": "string", "required": true },
        { "name": "content", "type": "richtext", "required": true },
        { "name": "status", "type": "string", "required": false, "default": "draft" }
      ]
    }
  ]
}
```

## Updating an existing spec

Edit the file, then re-validate. Two rules:

- **Keep it in sync with the schema.** If `src/content.config.ts` or `payload.config.ts` changed, the spec is stale until you re-read it.
- **Removing a content type or field is a breaking change** for anything that publishes into it. Say so when reporting the edit.

## Checking the validator

If the validator itself looks wrong, it carries its own tests:

```bash
node scripts/validate-spec.mjs --self-test
```

Eleven cases, one valid spec and ten that must be rejected. Any change to the rules should keep this at exit 0.

## Next step

A clean spec is what the **publishing-content** skill consumes.
