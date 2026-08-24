# cms-publish.json format

## Contents

- Top level
- transport
- auth
- contentTypes
- fields
- slug
- Worked examples (file-based, REST, SDK, CLI)

## Top level

| Key | Required | Type | Meaning |
|-----|----------|------|---------|
| `cms` | yes | string | Free-form identifier for the system, e.g. `astro-content-collections`, `wordpress`, `sanity`. In-house CMSes are fine — any non-empty string is valid. |
| `cmsVersion` | no | string | Major version, for skills that branch on it (Astro v4 vs v5). |
| `transport` | yes | object | How content reaches the CMS. See below. |
| `auth` | no | object | Credentials needed. Absent means `{ "type": "none" }`. |
| `contentTypes` | yes | array | One entry per publishable type. Must not be empty. |
| `notes` | no | string | Anything a future reader needs — quirks, gotchas, where the schema lives. |

## transport

`transport.type` is one of four values. Each requires a different key.

| type | Required key | Use when |
|------|--------------|----------|
| `git-commit` | — | Content is a file in the repo. Astro, Hugo, Jekyll, Eleventy, Next MDX, Decap, Tina. |
| `rest` | `baseUrl` | An HTTP API. WordPress, Ghost, Strapi, Directus, Drupal. |
| `sdk` | `package` | A first-party client library does the write. Sanity, Contentful, Payload local API. |
| `cli` | `command` | A command-line tool does the write. `wp post create`, `hugo new`, custom scripts. |

```json
{ "type": "git-commit", "branch": "main" }
{ "type": "rest", "baseUrl": "https://example.com/wp-json/wp/v2" }
{ "type": "sdk", "package": "@sanity/client", "dataset": "production" }
{ "type": "cli", "command": "wp post create" }
```

Extra keys are allowed and passed through — `branch`, `dataset`, `projectId`, `spaceId`. Add whatever the transport needs.

## auth

`auth.type` is `none`, `token`, `basic`, or `oauth`. Anything other than `none` requires a non-empty `envVars` array.

```json
{ "type": "basic", "envVars": ["WP_USER", "WP_APP_PASSWORD"] }
```

**`envVars` holds names, never values.** This file is committed. A secret written here is a leaked secret. The validator warns when a listed variable is unset in the current environment, so a missing credential surfaces before a publish attempt rather than during one.

## contentTypes

| Key | Required | Meaning |
|-----|----------|---------|
| `name` | yes | Lowercase kebab-case, unique within the spec. |
| `path` | for `git-commit` | Directory relative to project root, e.g. `src/content/blog`. |
| `resource` | for `rest`, `sdk`, `cli` | API resource, document type, or subcommand target, e.g. `posts`, `blogPost`. |
| `format` | for `git-commit` | One of `md`, `mdx`, `markdoc`, `json`, `yaml`. |
| `fields` | yes | Non-empty array. See below. |
| `slug` | no | How the URL slug is derived. See below. |

## fields

Every field needs `name`, `type`, and `required`.

```json
{ "name": "pubDate", "type": "date", "required": true }
```

Types: `string`, `text`, `richtext`, `number`, `boolean`, `date`, `datetime`, `array`, `reference`, `image`, `file`.

- `string` is a single line; `text` is multi-line plain; `richtext` is HTML, Markdown body, or a portable-text block.
- `reference` points at another content type. Add `"to": "authors"` to say which.
- `array` should carry `"items": "string"` when the element type is known.

Optional per-field keys, all passed through: `default`, `enum`, `items`, `to`, `max`, `description`.

A content type where nothing is required draws a validator warning. Almost every CMS requires at least a title.

## slug

```json
{ "source": "title", "strategy": "kebab-case" }
```

`source` names the field the slug derives from. `strategy` is usually `kebab-case`. Omit the whole key when the CMS assigns slugs itself — most REST and SDK CMSes do.

## Worked examples

### File-based (Astro)

```json
{
  "cms": "astro-content-collections",
  "cmsVersion": "5.2.1",
  "transport": { "type": "git-commit", "branch": "main" },
  "contentTypes": [
    {
      "name": "blog",
      "path": "src/content/blog",
      "format": "mdx",
      "slug": { "source": "title", "strategy": "kebab-case" },
      "fields": [
        { "name": "title", "type": "string", "required": true },
        { "name": "pubDate", "type": "date", "required": true },
        { "name": "draft", "type": "boolean", "required": false, "default": true }
      ]
    }
  ]
}
```

### REST (WordPress)

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
        { "name": "status", "type": "string", "required": false, "default": "draft", "enum": ["draft", "publish", "pending"] },
        { "name": "categories", "type": "array", "required": false, "items": "number" }
      ]
    }
  ]
}
```

### SDK (Sanity)

```json
{
  "cms": "sanity",
  "transport": { "type": "sdk", "package": "@sanity/client", "dataset": "production" },
  "auth": { "type": "token", "envVars": ["SANITY_PROJECT_ID", "SANITY_API_TOKEN"] },
  "contentTypes": [
    {
      "name": "post",
      "resource": "post",
      "fields": [
        { "name": "title", "type": "string", "required": true },
        { "name": "body", "type": "richtext", "required": true },
        { "name": "author", "type": "reference", "required": false, "to": "author" }
      ]
    }
  ]
}
```

### CLI (Hugo)

```json
{
  "cms": "hugo",
  "transport": { "type": "cli", "command": "hugo new content" },
  "contentTypes": [
    {
      "name": "posts",
      "resource": "posts",
      "format": "md",
      "fields": [
        { "name": "title", "type": "string", "required": true },
        { "name": "date", "type": "datetime", "required": true },
        { "name": "draft", "type": "boolean", "required": false, "default": true }
      ]
    }
  ]
}
```

Hugo needs both `resource` (the CLI target) and `format` — it writes a file but a command does the writing.
