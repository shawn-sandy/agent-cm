#!/usr/bin/env node
// Moves a plugin's version in lockstep across its plugin.json and its entry in
// the marketplace catalog, then steps the catalog's own version by the same
// amount. Those two plugin versions must match — `claude plugin validate
// --strict` fails when they drift, and plugin.json wins at install time.
//
//   node scripts/version.mjs <plugin> <major|minor|patch|X.Y.Z>
//   node scripts/version.mjs --check-bumped <base-ref>
//   node scripts/version.mjs --self-test
//
// Zero dependencies, Node 18+.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MARKETPLACE = join(ROOT, '.claude-plugin', 'marketplace.json');
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const pluginManifest = (name) =>
  join(ROOT, 'plugins', name, '.claude-plugin', 'plugin.json');

/** Resolve a step keyword or explicit version against the current version. */
export function bump(current, step) {
  const parsed = SEMVER.exec(current);
  if (!parsed) throw new Error(`current version is not semver: "${current}"`);
  const [major, minor, patch] = parsed.slice(1).map(Number);
  if (step === 'major') return `${major + 1}.0.0`;
  if (step === 'minor') return `${major}.${minor + 1}.0`;
  if (step === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (SEMVER.test(step)) return step;
  throw new Error(`step must be major, minor, patch, or X.Y.Z — got "${step}"`);
}

/**
 * The catalog version to write. A relative step moves the catalog by the same
 * amount. An explicit X.Y.Z names the *plugin's* version, not the catalog's, so
 * assigning it could move the catalog backwards — step it by patch instead.
 */
export function catalogTarget(catalogCurrent, step) {
  return bump(catalogCurrent, SEMVER.test(step) ? 'patch' : step);
}

// plugin.json keeps its keywords array inline, so a JSON.stringify round-trip
// would reflow it. Patch the one version field textually instead, and refuse to
// guess if a future edit adds a second version key.
export function setPluginJsonVersion(text, next) {
  const found = text.match(/"version"\s*:/g) ?? [];
  if (found.length !== 1) {
    throw new Error(
      `expected exactly one "version" key in plugin.json, found ${found.length}`,
    );
  }
  return text.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${next}"`);
}

/**
 * Decide whether one plugin satisfies the bump rule. Pure — the git lookups
 * happen in checkBumped, so this stays testable.
 */
export function bumpVerdict({ changed, baseVersion, headVersion }) {
  if (!changed) return { ok: true, note: 'untouched' };
  if (baseVersion === null) return { ok: true, note: `new plugin at ${headVersion}` };
  if (baseVersion === headVersion) {
    return { ok: false, note: `changed but still ${headVersion} — bump it` };
  }
  return { ok: true, note: `${baseVersion} -> ${headVersion}` };
}

/**
 * Decide whether the catalog version satisfies its own rule: it moves whenever
 * any plugin changes, is added, or is removed. Pure, like bumpVerdict.
 */
export function catalogVerdict({ pluginsChanged, baseVersion, headVersion }) {
  if (!pluginsChanged) return { ok: true, note: 'no plugin changes' };
  if (baseVersion === null) return { ok: true, note: `new catalog at ${headVersion}` };
  if (baseVersion === headVersion) {
    return { ok: false, note: `plugins changed but catalog is still ${headVersion} — bump it` };
  }
  return { ok: true, note: `${baseVersion} -> ${headVersion}` };
}

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });

/** CI guard: every plugin touched since <base-ref> must have a new version. */
function checkBumped(baseRef) {
  if (!baseRef) {
    console.error('usage: node scripts/version.mjs --check-bumped <base-ref>');
    return 1;
  }
  // merge-base is the real precondition: `git diff A...HEAD` needs it, and it
  // fails both on an unknown ref and on a shallow clone that lacks the history.
  // rev-parse alone passes on a shallow clone and lets the diff throw later.
  try {
    execFileSync('git', ['merge-base', baseRef, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
  } catch {
    console.error(
      `cannot compare against "${baseRef}" — unknown ref, or the clone is too shallow to reach it.` +
        `\nIn CI, actions/checkout needs fetch-depth: 0.`,
    );
    return 1;
  }

  const names = readdirSync(join(ROOT, 'plugins'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // A plugin present at base but gone now is a removal — the catalog must move
  // for that too, and the directory scan above cannot see it.
  let baseNames = [];
  try {
    baseNames = JSON.parse(git('show', `${baseRef}:.claude-plugin/marketplace.json`)).plugins.map(
      (entry) => entry.name,
    );
  } catch {
    // No catalog at base — the whole marketplace is new in this branch.
  }
  const removed = baseNames.filter((n) => !names.includes(n));
  let pluginsChanged = removed.length > 0;
  if (removed.length) console.log(`ok   ${removed.join(', ')}: removed`);

  let failed = 0;
  for (const name of names) {
    const rel = `plugins/${name}`;
    const changed = git('diff', '--name-only', `${baseRef}...HEAD`, '--', rel).trim() !== '';
    if (changed) pluginsChanged = true;

    let baseVersion = null;
    try {
      baseVersion = JSON.parse(
        git('show', `${baseRef}:${rel}/.claude-plugin/plugin.json`),
      ).version;
    } catch {
      // Absent at base — a plugin added in this branch.
    }
    const headVersion = JSON.parse(readFileSync(pluginManifest(name), 'utf8')).version;

    const { ok, note } = bumpVerdict({ changed, baseVersion, headVersion });
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${note}`);
    if (!ok) failed++;
  }

  let baseCatalog = null;
  try {
    baseCatalog = JSON.parse(git('show', `${baseRef}:.claude-plugin/marketplace.json`)).version;
  } catch {
    // Absent at base, handled by catalogVerdict.
  }
  const headCatalog = JSON.parse(readFileSync(MARKETPLACE, 'utf8')).version;
  const cat = catalogVerdict({ pluginsChanged, baseVersion: baseCatalog, headVersion: headCatalog });
  console.log(`${cat.ok ? 'ok  ' : 'FAIL'} marketplace catalog: ${cat.note}`);
  if (!cat.ok) failed++;

  if (failed) {
    console.error(
      `\n${failed} version(s) not bumped.` +
        `\nRun: node scripts/version.mjs <plugin> <major|minor|patch>`,
    );
    return 1;
  }
  return 0;
}

function main(argv) {
  const [name, step] = argv;
  if (!name || !step) {
    console.error('usage: node scripts/version.mjs <plugin> <major|minor|patch|X.Y.Z>');
    return 1;
  }

  const manifestPath = pluginManifest(name);
  let manifestText;
  try {
    manifestText = readFileSync(manifestPath, 'utf8');
  } catch {
    console.error(`no plugin manifest at ${manifestPath}`);
    return 1;
  }

  const catalog = JSON.parse(readFileSync(MARKETPLACE, 'utf8'));
  const entry = catalog.plugins.find((p) => p.name === name);
  if (!entry) {
    console.error(`"${name}" has no entry in .claude-plugin/marketplace.json`);
    return 1;
  }

  // plugin.json is the source of truth: it wins at install time.
  const current = JSON.parse(manifestText).version;
  // Build and validate BOTH output texts before touching the disk. Writing the
  // catalog first and letting setPluginJsonVersion throw afterwards left the two
  // files disagreeing — the exact drift this tool exists to prevent.
  let next, catalogNext, catalogText, manifestNext;
  try {
    next = bump(current, step);
    catalogNext = catalogTarget(catalog.version, step);
    entry.version = next;
    catalog.version = catalogNext;
    catalogText = JSON.stringify(catalog, null, 2) + '\n';
    manifestNext = setPluginJsonVersion(manifestText, next);
  } catch (err) {
    console.error(err.message);
    return 1;
  }

  writeFileSync(MARKETPLACE, catalogText);
  writeFileSync(manifestPath, manifestNext);

  // Read back rather than trusting the writes.
  const wroteManifest = JSON.parse(readFileSync(manifestPath, 'utf8')).version;
  const wroteCatalog = JSON.parse(readFileSync(MARKETPLACE, 'utf8'));
  const wroteEntry = wroteCatalog.plugins.find((p) => p.name === name).version;
  if (wroteManifest !== next || wroteEntry !== next) {
    console.error(
      `write verification failed: plugin.json=${wroteManifest} entry=${wroteEntry} expected=${next}`,
    );
    return 1;
  }

  console.log(`${name}: ${current} -> ${next}`);
  console.log(`marketplace: ${catalogNext}`);
  console.log('');
  console.log('Next: add a CHANGELOG.md entry, then run `claude plugin validate . --strict`');
  return 0;
}

function selfTest() {
  const failures = [];
  const check = (label, actual, expected) => {
    if (actual !== expected) failures.push(`${label}: got ${actual}, expected ${expected}`);
  };
  const throws = (label, fn) => {
    try {
      fn();
      failures.push(`${label}: expected a throw, got none`);
    } catch {
      /* expected */
    }
  };

  check('minor', bump('0.1.0', 'minor'), '0.2.0');
  check('major', bump('0.1.0', 'major'), '1.0.0');
  check('patch', bump('0.1.0', 'patch'), '0.1.1');
  check('major resets', bump('1.4.7', 'major'), '2.0.0');
  check('minor resets patch', bump('1.4.7', 'minor'), '1.5.0');
  check('explicit', bump('0.1.0', '2.3.4'), '2.3.4');
  throws('rejects bad step', () => bump('0.1.0', 'sideways'));
  throws('rejects partial version', () => bump('0.1.0', '2.3'));
  throws('rejects bad current', () => bump('v0.1', 'patch'));

  const sample = '{\n  "name": "x",\n  "version": "0.1.0",\n  "keywords": ["a", "b"]\n}\n';
  const patched = setPluginJsonVersion(sample, '0.2.0');
  check('patches version', /"version": "0\.2\.0"/.test(patched), true);
  check('leaves keywords inline', patched.includes('"keywords": ["a", "b"]'), true);
  throws('refuses two version keys', () =>
    setPluginJsonVersion(sample.replace('"name": "x"', '"version": "9.9.9"'), '0.2.0'),
  );

  const verdict = (o) => bumpVerdict(o).ok;
  check('untouched plugin passes', verdict({ changed: false, baseVersion: '0.1.0', headVersion: '0.1.0' }), true);
  check('changed without bump fails', verdict({ changed: true, baseVersion: '0.1.0', headVersion: '0.1.0' }), false);
  check('changed with bump passes', verdict({ changed: true, baseVersion: '0.1.0', headVersion: '0.2.0' }), true);
  check('new plugin passes', verdict({ changed: true, baseVersion: null, headVersion: '0.1.0' }), true);

  check('explicit target patches catalog', catalogTarget('1.4.0', '0.2.0'), '1.4.1');
  check('explicit target never downgrades', catalogTarget('1.4.0', '0.2.0') > '1.4.0', true);
  check('relative step passes through', catalogTarget('1.4.0', 'minor'), '1.5.0');

  const cat = (o) => catalogVerdict(o).ok;
  check('no plugin changes passes', cat({ pluginsChanged: false, baseVersion: '0.1.0', headVersion: '0.1.0' }), true);
  check('plugins changed without catalog bump fails', cat({ pluginsChanged: true, baseVersion: '0.1.0', headVersion: '0.1.0' }), false);
  check('plugins changed with catalog bump passes', cat({ pluginsChanged: true, baseVersion: '0.1.0', headVersion: '0.2.0' }), true);
  check('new catalog passes', cat({ pluginsChanged: true, baseVersion: null, headVersion: '0.1.0' }), true);

  if (failures.length) {
    for (const f of failures) console.error(`FAIL ${f}`);
    console.error(`\n${failures.length} failing case(s)`);
    return 1;
  }
  console.log('23 cases pass');
  return 0;
}

const args = process.argv.slice(2);
process.exit(
  args[0] === '--self-test'
    ? selfTest()
    : args[0] === '--check-bumped'
      ? checkBumped(args[1])
      : main(args),
);
