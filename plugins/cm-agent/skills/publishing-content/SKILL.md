---
name: publishing-content
description: Publishes a draft into a project's CMS using the transport, field mapping, and auth declared in cms-publish.json, after checking required fields and running a dry run. Use when the user asks to publish, push, post, or upload content to their CMS, or to check a draft against the spec before publishing it.
license: MIT
compatibility: Requires Node 18+ and, for remote CMSes, network access and credentials in the environment
metadata:
  author: shawn-sandy
  version: "0.1.0"
allowed-tools: Read Write Edit Glob Grep Bash(node:*) Bash(git:*)
---

# Publishing content

Publishing is outward-facing and often irreversible. **Never publish without showing the user exactly what will be sent and getting an explicit yes.** A dry run is not optional.

## Workflow

```
Publish Progress:
- [ ] Step 1: Load and validate the spec
- [ ] Step 2: Pick the content type
- [ ] Step 3: Map the draft onto its fields
- [ ] Step 4: Dry run
- [ ] Step 5: Confirm with the user
- [ ] Step 6: Publish
- [ ] Step 7: Verify
```

**Step 1 — Load and validate the spec.** Read `cms-publish.json` from the project root.

```bash
node scripts/validate-spec.mjs cms-publish.json
```

If it errors, or the file does not exist, stop and run the **writing-publish-specs** skill. Publishing against a broken spec produces broken content.

**Step 2 — Pick the content type.** Match the draft to one entry in `contentTypes`. If more than one fits, ask — do not guess. Publishing a post as a page is not quietly fixable.

**Step 3 — Map the draft onto its fields.** For each field in the chosen type:

- **Required and present** — carry it over.
- **Required and missing** — derive it if the derivation is unambiguous (`slug` from `title`, `pubDate` from today). Otherwise ask. Never fabricate a required value.
- **Optional with a `default`** — apply the default.
- **Not in the spec** — drop it and say which fields you dropped. Extra keys are rejected by strict CMSes and silently ignored by lenient ones; both are worse than being told.

Respect `enum` when present. Respect `slug.strategy` when the spec declares one.

**Step 4 — Dry run.** Produce the exact payload without sending it. Per transport:

| transport | Dry run |
|-----------|---------|
| `git-commit` | Show the target file path and full file contents. Do not write. |
| `rest` | Show method, URL, headers with credential values masked, and the JSON body. Do not send. |
| `sdk` | Show the client call and its document argument. Do not call. |
| `cli` | Show the exact command line. Do not run. |

Transport mechanics are in [references/publish-transports.md](references/publish-transports.md).

**Step 5 — Confirm.** Show the dry run and the destination — the branch, the site URL, the dataset. Wait for an explicit yes. "Publish it" earlier in the conversation covers this draft only, not the next one.

Confirm again, separately, when the publish is live rather than draft: `status: publish`, `draft: false`, a production dataset. Say plainly that it will be publicly visible.

**Step 6 — Publish.** Send it. If it fails, report the CMS's own error verbatim before interpreting it. Retry only for transient network errors, at most twice — a 4xx will not fix itself.

**Step 7 — Verify.** Confirm the content landed:

- `git-commit` — the file exists and the commit is in the log. Note that it is committed, not deployed, and not pushed unless the user asked.
- `rest` / `sdk` — read the created record back by the ID the CMS returned.
- `cli` — check the command's exit code and whatever file or record it reports.

Report the resulting URL or ID.

## Credentials

Read credentials from the environment variables named in `auth.envVars`. Never print a credential value, never write one into a file, and never put one in a URL query string. If a required variable is unset, stop and tell the user which one — do not prompt them to paste it into the chat.

## Bulk publishing

Publishing many drafts multiplies the blast radius. Dry-run **every** item and show the full list before sending any of them. Then publish one, verify it, and only continue once that one is confirmed correct. Stop the batch on the first failure and report how many landed.
