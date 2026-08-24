---
name: detecting-cms
description: Identifies which CMS or content system a project publishes to by inspecting dependencies, config files, content directories, and environment variables, then reports the CMS, its content locations, and how content reaches it. Use when the user asks what CMS a project uses, before writing or updating a cms-publish.json spec, or when a publish step fails because the target system is unknown.
license: MIT
metadata:
  author: shawn-sandy
  version: "0.1.0"
allowed-tools: Read Glob Grep Bash(ls:*) Bash(cat:*) Bash(jq:*)
---

# Detecting a project's CMS

Detection answers four questions. Everything downstream depends on them:

1. **Which CMS** — the product and major version
2. **Where content lives** — directories, collections, or API resources
3. **How content gets in** — the transport (`git-commit`, `rest`, `cli`, or `sdk`)
4. **What auth it needs** — which env vars must be set

## Workflow

```
Detection Progress:
- [ ] Step 1: Read the dependency manifest
- [ ] Step 2: Look for config files
- [ ] Step 3: Locate content directories
- [ ] Step 4: Check environment variables
- [ ] Step 5: Resolve conflicts and report
```

**Step 1 — Read the dependency manifest.** `package.json`, `composer.json`, `Gemfile`, `go.mod`, or `requirements.txt`. Dependencies are the strongest single signal. Match them against [references/detection-signals.md](references/detection-signals.md).

**Step 2 — Look for config files.** A config file confirms a dependency is actually wired up rather than left over. `astro.config.mjs`, `sanity.config.ts`, `payload.config.ts`, `wp-config.php`, `config.toml`, `_config.yml`.

**Step 3 — Locate content directories.** `src/content/`, `content/`, `_posts/`, `posts/`. Read two or three existing files. Their frontmatter is the real field list — more accurate than any schema you infer from config.

**Step 4 — Check environment variables.** Read `.env.example`, `.env.local`, `.env`, and CI config. **Report variable names only. Never read, echo, or copy a secret value.**

**Step 5 — Resolve conflicts and report.** Use the precedence rules below, then produce the report.

## Precedence when signals conflict

Projects often carry more than one signal — an Astro site that also has a Contentful client, a WordPress theme with a Gatsby frontend. Apply in order:

1. **A config file beats a bare dependency.** An unused dependency is common; an unused config file is not.
2. **A populated content directory beats an empty one.** Content that exists is content that gets published.
3. **A recently committed content file beats an old one.** `git log -1 --format=%cs -- <path>` dates the last real use.
4. **Still ambiguous?** Report every candidate with its evidence and ask the user which one to target. Do not guess.

## Report format

```markdown
## Detected CMS

**CMS:** Astro content collections (astro 5.2.1)
**Confidence:** high
**Transport:** git-commit

**Evidence**
- `package.json` — astro@5.2.1, @astrojs/mdx@4.0.3
- `src/content.config.ts` — collections: blog, authors
- `src/content/blog/` — 24 .mdx files, last commit 2026-08-19

**Content types**
| Name | Path | Format | Fields (from existing frontmatter) |
|------|------|--------|-------------------------------------|
| blog | src/content/blog | mdx | title, description, pubDate, tags, draft |
| authors | src/content/authors | md | name, bio, avatar |

**Auth**
Not required — content is committed to the repository.

**Unresolved**
- `tags` is a string array in 20 files and a comma-separated string in 4. Confirm the intended type.
```

Report `Confidence: low` and list what is missing rather than inventing a field list. A wrong spec fails at publish time, which is far more expensive than asking now.

## Next step

Hand the report to the **writing-publish-specs** skill, which turns it into a validated `cms-publish.json`.
