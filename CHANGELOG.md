# Changelog

Notable changes to this marketplace and the plugins in it. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[semantic versioning](https://semver.org/spec/v2.0.0.html).

Plugin versions and the marketplace catalog version move together — see
[Versioning](README.md#versioning).

## [Unreleased]

### Added

- CI workflow (`.github/workflows/ci.yml`): validates the marketplace and runs
  every script self-test on pull requests and pushes to `main`.
- `scripts/version.mjs --check-bumped <base-ref>`: fails when a pull request
  edits a plugin without bumping its version, or changes a plugin without
  moving the catalog version. Runs in CI and locally.

### Fixed

- `version.mjs` no longer leaves the catalog and plugin versions disagreeing
  when a bump fails partway. Both output files are now built and validated
  before either is written.
- An explicit `X.Y.Z` target no longer assigns itself to the catalog version,
  which could move the catalog backwards. It patches the catalog instead.
- `--check-bumped` now reports a clean, actionable message on a shallow clone
  instead of throwing an uncaught error. It checks `git merge-base`, which
  `git rev-parse` passed on shallow clones.

## [0.2.0] — 2026-08-25

### Added

- `humanize-text` skill in `cms-publish`: detects the documented signs of AI
  writing — stock vocabulary, formulaic structure, promotional tone, formatting
  tells — and rewrites them out, emitting a `HUMANIZE REPORT` of what it found.
  Independent of `cms-publish.json`; runs on any prose.
- `scripts/version.mjs`: moves a plugin's version in lockstep across its
  `plugin.json` and its marketplace entry, which `claude plugin validate
  --strict` requires. Carries a `--self-test`.
- `CHANGELOG.md` and a Versioning section in the README.

### Changed

- The `cms-publish` description and keywords now mention writing and editing, so
  `humanize-text` is discoverable from the marketplace listing.

## [0.1.0] — 2026-08-24

### Added

- Marketplace catalog and the `cms-publish` plugin.
- `detecting-cms`: identifies a project's CMS from dependencies, config files,
  content directories, and environment variable names.
- `writing-publish-specs`: writes and validates `cms-publish.json`, with a
  zero-dependency validator and an eleven-case self-test.
- `publishing-content`: publishes a draft through the spec's transport after a
  required-field check and a dry run.
