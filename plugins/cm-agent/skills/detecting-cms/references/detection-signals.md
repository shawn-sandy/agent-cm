# CMS detection signals

## Contents

- How to read this table
- File-based systems (transport: git-commit)
- Headless APIs (transport: sdk or rest)
- Hosted CMSes (transport: rest or cli)
- Ambiguous and layered setups
- When nothing matches

## How to read this table

Each entry lists the **dependency**, the **config file** that confirms it, where **content** lives, the **transport** to record in `cms-publish.json`, and the **auth** env vars to look for.

A dependency alone is weak evidence. A dependency plus its config file plus a populated content directory is strong evidence.

## File-based systems (transport: git-commit)

Content is Markdown or MDX in the repository. Publishing means writing a file and committing it. No credentials needed; the deploy pipeline does the rest.

| CMS | Dependency | Config | Content | Auth |
|-----|-----------|--------|---------|------|
| Astro content collections | `astro` | `astro.config.*` + `src/content.config.ts` (v5) or `src/content/config.ts` (v4) | `src/content/<collection>/` | none |
| Eleventy | `@11ty/eleventy` | `.eleventy.js`, `eleventy.config.*` | `src/posts/`, `content/` | none |
| Hugo | none (Go binary) | `config.toml`, `hugo.toml`, `config/_default/` | `content/<section>/` | none |
| Jekyll | `jekyll` (Gemfile) | `_config.yml` | `_posts/`, `_drafts/` | none |
| Next.js + MDX | `next` + `@next/mdx` or `next-mdx-remote` | `next.config.*` | `content/`, `posts/`, `app/**/page.mdx` | none |
| Docusaurus | `@docusaurus/core` | `docusaurus.config.*` | `docs/`, `blog/` | none |
| VitePress | `vitepress` | `.vitepress/config.*` | `docs/` | none |
| Nuxt Content | `@nuxt/content` | `nuxt.config.*` | `content/` | none |

**Astro version matters.** v5 uses `src/content.config.ts` with loaders; v4 uses `src/content/config.ts`. The schema in that file gives you exact field types via Zod — read it rather than inferring from frontmatter when it exists.

## Headless APIs (transport: sdk or rest)

Content lives in a remote service. Publishing means an authenticated API call.

| CMS | Dependency | Config | Content model | Auth env vars |
|-----|-----------|--------|---------------|---------------|
| Sanity | `@sanity/client`, `sanity` | `sanity.config.ts`, `sanity.cli.ts` | `schemas/`, `schemaTypes/` | `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_TOKEN` |
| Contentful | `contentful`, `contentful-management` | `.contentfulrc.json` | fetched from the API | `CONTENTFUL_SPACE_ID`, `CONTENTFUL_MANAGEMENT_TOKEN` |
| Payload | `payload` | `payload.config.ts` | `collections/` | `PAYLOAD_SECRET`, `DATABASE_URI` |
| Strapi | `@strapi/strapi` | `config/`, `src/api/` | `src/api/<type>/content-types/` | `STRAPI_URL`, `STRAPI_API_TOKEN` |
| Directus | `@directus/sdk` | `docker-compose.yml`, `.env` | fetched from the API | `DIRECTUS_URL`, `DIRECTUS_TOKEN` |
| Prismic | `@prismicio/client` | `prismic.config.*`, `slicemachine.config.json` | `customtypes/` | `PRISMIC_ACCESS_TOKEN` |
| Storyblok | `@storyblok/*` | `storyblok.config.*` | fetched from the API | `STORYBLOK_TOKEN` |

For Payload, Sanity, and Strapi the schema files are authoritative — read `collections/`, `schemaTypes/`, or `content-types/` and take the field list from there. Do not infer fields from sample documents when a schema exists.

## Hosted CMSes (transport: rest or cli)

| CMS | Signal | Content model | Auth env vars |
|-----|--------|---------------|---------------|
| WordPress | `wp-config.php`, `wp-content/`, `composer.json` with `johnpbloch/wordpress` | post types via `/wp-json/wp/v2/types` | `WP_URL`, `WP_USER`, `WP_APP_PASSWORD` |
| Ghost | `@tryghost/admin-api` | fixed: posts, pages, tags | `GHOST_URL`, `GHOST_ADMIN_API_KEY` |
| Drupal | `composer.json` with `drupal/core` | `/jsonapi` | `DRUPAL_URL`, `DRUPAL_TOKEN` |
| Craft | `composer.json` with `craftcms/cms` | `config/project/` | `CRAFT_TOKEN` |

WordPress publishing has two viable transports. Prefer `rest` (the `/wp-json/wp/v2/` endpoints with an application password) — it works remotely. Use `cli` (`wp post create`) only when the agent has shell access on the host itself.

## Ambiguous and layered setups

**Decap / Netlify CMS** (`public/admin/config.yml`, `static/admin/config.yml`) is an editing UI over a file-based system. The real transport is `git-commit`. Record the underlying static site generator as the CMS, and note Decap in `notes`.

**Tina CMS** (`tina/config.ts`) behaves the same way — `git-commit` underneath.

**A headless API next to a content directory** usually means a migration in progress, or a build-time fetch that caches remote content locally. Check which one the deploy script actually reads. If the build fetches from the API, the API is the publish target and the local files are a cache — never publish by writing to a cache.

**A monorepo** may hold several sites with different CMSes. Detect per package, not per repository, and write one `cms-publish.json` per package.

## When nothing matches

Report `Confidence: low` and list what you did find: any directory of Markdown files, any API client, any admin route. Ask the user to name the CMS. An unrecognized or in-house CMS is still fully specifiable by hand — the `cms` field in `cms-publish.json` is a free-form string, and `transport` covers custom CLIs and REST endpoints.
