# Publish transports

## Contents

- git-commit
- rest
- sdk
- cli
- Failure modes worth recognizing

## git-commit

Content is a file in the repository. Publishing writes it and commits it.

1. Build the path: `<contentType.path>/<slug>.<contentType.format>`.
2. Build the document — frontmatter from the spec fields, body after it.
3. Check for an existing file at that path. **Overwriting is an update, not a publish** — say so and confirm separately.
4. Write, then `git add <path>` and commit.

```yaml
---
title: "Getting started"
pubDate: 2026-08-24
draft: false
---

Body content here.
```

Frontmatter is YAML for `md`, `mdx`, and `markdoc`. Quote strings containing `:` or `#`. Dates go in as `YYYY-MM-DD` unquoted for `date`, ISO 8601 for `datetime`.

**Do not push unless asked.** Committing is local and reversible; pushing triggers a deploy. They are separate decisions.

## rest

An authenticated HTTP request. Use `transport.baseUrl` plus the content type's `resource`.

```
POST {baseUrl}/{resource}
Content-Type: application/json
Authorization: <from auth.envVars>
```

Auth by `auth.type`:

- `basic` — `Authorization: Basic base64(USER:PASSWORD)`. WordPress application passwords use this.
- `token` — `Authorization: Bearer <token>`. Ghost, Strapi, Directus.
- `oauth` — the token is already in the env var; send it as Bearer. This skill does not run an OAuth flow.

The response carries the new record's ID and usually its public URL. Keep both for step 7.

**WordPress specifics.** `status` defaults to `draft` and that is the safe default — publishing live requires `"status": "publish"` and a separate confirmation. `content` and `excerpt` are rendered objects on read but plain strings on write. Category and tag fields take term IDs, not names; resolve names to IDs against `/categories` and `/tags` first.

## sdk

A first-party client library performs the write. Use the package named in `transport.package`.

Check it is installed before writing any code — `node -e "require.resolve('@sanity/client')"`. If it is missing, say so and stop. Do not install a package into the user's project without asking.

Sanity: `client.create(doc)` where `doc._type` is the content type's `resource`. Contentful: `environment.createEntry(type, { fields })`, and note that entries are created unpublished — `entry.publish()` is a second, separately confirmed step. Payload local API: `payload.create({ collection, data })`.

## cli

Run the command in `transport.command` with the content type's `resource` and the mapped fields as arguments or flags.

Show the exact command line at dry run. Quote every value that could contain a space or a shell metacharacter. Never interpolate a credential into a command line — process arguments are visible to other processes; pass secrets through the environment.

Check the exit code. A zero exit with error text on stderr still counts as a failure worth reporting.

## Failure modes worth recognizing

| Symptom | Usual cause |
|---------|-------------|
| 401 / 403 | Credential unset, expired, or lacking write scope. Check the `auth.envVars` names are the ones actually set. |
| 400 with a field name | The spec and the CMS disagree. Re-run **writing-publish-specs** against the schema — do not patch the payload by hand. |
| 404 on a valid-looking URL | `resource` is wrong, or `baseUrl` is missing its version segment (`/wp-json/wp/v2`). |
| 409 / duplicate slug | Content already exists at that slug. This is an update; confirm before overwriting. |
| Commit succeeds, site unchanged | Committed but not pushed, or the deploy has not run. Not a publishing failure. |
| Publishes but fields are empty | Field names were dropped in mapping because the spec omits them. Add them to the spec. |
