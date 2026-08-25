#!/usr/bin/env node
// Validates a cms-publish.json spec. No dependencies — runs on any Node 18+.
//
// Usage:
//   node validate-spec.mjs [path/to/cms-publish.json]   default: ./cms-publish.json
//   node validate-spec.mjs --self-test                  check the validator itself
//
// Exit 0 = valid (warnings allowed). Exit 1 = errors, listed on stderr.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const TRANSPORTS = ['git-commit', 'rest', 'cli', 'sdk'];
const AUTH_TYPES = ['none', 'token', 'basic', 'oauth'];
const FIELD_TYPES = [
  'string', 'text', 'richtext', 'number', 'boolean',
  'date', 'datetime', 'array', 'reference', 'image', 'file',
];
const FILE_FORMATS = ['md', 'mdx', 'markdoc', 'json', 'yaml'];

// Each transport needs one key on `transport` and one location key on every content type.
const TRANSPORT_RULES = {
  'git-commit': { transportKey: null, locationKey: 'path' },
  rest: { transportKey: 'baseUrl', locationKey: 'resource' },
  cli: { transportKey: 'command', locationKey: 'resource' },
  sdk: { transportKey: 'package', locationKey: 'resource' },
};

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const list = (arr) => arr.join(', ');

/**
 * @returns {{errors: string[], warnings: string[]}}
 */
export function validateSpec(spec, { checkEnv = true } = {}) {
  const errors = [];
  const warnings = [];

  if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
    return { errors: ['Spec must be a JSON object.'], warnings };
  }

  // --- cms ---
  if (typeof spec.cms !== 'string' || spec.cms.trim() === '') {
    errors.push('`cms` is required and must be a non-empty string (e.g. "astro-content-collections", "wordpress").');
  }

  // --- transport ---
  let rules = null;
  if (spec.transport === null || typeof spec.transport !== 'object' || Array.isArray(spec.transport)) {
    errors.push(`\`transport\` is required and must be an object with a \`type\` of: ${list(TRANSPORTS)}.`);
  } else if (!TRANSPORTS.includes(spec.transport.type)) {
    errors.push(`\`transport.type\` is "${spec.transport.type}". Must be one of: ${list(TRANSPORTS)}.`);
  } else {
    rules = TRANSPORT_RULES[spec.transport.type];
    const key = rules.transportKey;
    if (key && (typeof spec.transport[key] !== 'string' || spec.transport[key].trim() === '')) {
      errors.push(`\`transport.${key}\` is required when \`transport.type\` is "${spec.transport.type}".`);
    }
  }

  // --- auth (optional; absent means none) ---
  if (spec.auth !== undefined) {
    if (spec.auth === null || typeof spec.auth !== 'object' || Array.isArray(spec.auth)) {
      errors.push(`\`auth\` must be an object with a \`type\` of: ${list(AUTH_TYPES)}.`);
    } else if (!AUTH_TYPES.includes(spec.auth.type)) {
      errors.push(`\`auth.type\` is "${spec.auth.type}". Must be one of: ${list(AUTH_TYPES)}.`);
    } else if (spec.auth.type !== 'none') {
      const vars = spec.auth.envVars;
      if (!Array.isArray(vars) || vars.length === 0 || !vars.every((v) => typeof v === 'string' && v.trim() !== '')) {
        errors.push(`\`auth.envVars\` must be a non-empty array of variable names when \`auth.type\` is "${spec.auth.type}".`);
      } else if (checkEnv) {
        // A missing credential is a runtime problem, not a spec problem — warn, do not fail.
        const missing = vars.filter((v) => !process.env[v]);
        if (missing.length) {
          warnings.push(`Not set in this environment: ${list(missing)}. Publishing will fail until they are.`);
        }
      }
    }
  }

  // --- contentTypes ---
  if (!Array.isArray(spec.contentTypes) || spec.contentTypes.length === 0) {
    errors.push('`contentTypes` is required and must be a non-empty array.');
    return { errors, warnings };
  }

  const seenTypes = new Set();
  spec.contentTypes.forEach((ct, i) => {
    const at = `contentTypes[${i}]`;
    if (ct === null || typeof ct !== 'object' || Array.isArray(ct)) {
      errors.push(`${at} must be an object.`);
      return;
    }
    const label = typeof ct.name === 'string' && ct.name ? `${at} ("${ct.name}")` : at;

    if (typeof ct.name !== 'string' || !KEBAB.test(ct.name)) {
      errors.push(`${at}.name must be lowercase kebab-case (got ${JSON.stringify(ct.name)}).`);
    } else if (seenTypes.has(ct.name)) {
      errors.push(`${at}.name "${ct.name}" is a duplicate. Content type names must be unique.`);
    } else {
      seenTypes.add(ct.name);
    }

    if (rules) {
      const key = rules.locationKey;
      if (typeof ct[key] !== 'string' || ct[key].trim() === '') {
        errors.push(`${label}.${key} is required when \`transport.type\` is "${spec.transport.type}".`);
      }
      if (spec.transport.type === 'git-commit' && !FILE_FORMATS.includes(ct.format)) {
        errors.push(`${label}.format is ${JSON.stringify(ct.format)}. File-based publishing requires one of: ${list(FILE_FORMATS)}.`);
      }
    }

    if (!Array.isArray(ct.fields) || ct.fields.length === 0) {
      errors.push(`${label}.fields is required and must be a non-empty array.`);
      return;
    }

    const seenFields = new Set();
    let hasRequired = false;
    ct.fields.forEach((f, j) => {
      const fAt = `${label}.fields[${j}]`;
      if (f === null || typeof f !== 'object' || Array.isArray(f)) {
        errors.push(`${fAt} must be an object.`);
        return;
      }
      if (typeof f.name !== 'string' || f.name.trim() === '') {
        errors.push(`${fAt}.name is required and must be a non-empty string.`);
      } else if (seenFields.has(f.name)) {
        errors.push(`${fAt}.name "${f.name}" is a duplicate within "${ct.name}".`);
      } else {
        seenFields.add(f.name);
      }
      if (!FIELD_TYPES.includes(f.type)) {
        errors.push(`${fAt}.type is ${JSON.stringify(f.type)}. Must be one of: ${list(FIELD_TYPES)}.`);
      }
      if (typeof f.required !== 'boolean') {
        errors.push(`${fAt}.required is required and must be true or false.`);
      }
      if (f.required === true) hasRequired = true;
    });

    // A type where nothing is required usually means the field list was never checked against the CMS.
    if (!hasRequired && seenFields.size > 0) {
      warnings.push(`${label} has no required fields. Confirm that the CMS really accepts an empty document.`);
    }
  });

  return { errors, warnings };
}

function report(label, { errors, warnings }) {
  for (const w of warnings) console.error(`WARN  ${w}`);
  if (errors.length === 0) {
    console.log(`OK    ${label} is valid${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : ''}.`);
    return 0;
  }
  for (const e of errors) console.error(`ERROR ${e}`);
  console.error(`\n${errors.length} error${errors.length > 1 ? 's' : ''} in ${label}. Fix them and run this script again.`);
  return 1;
}

// --- self-test: proves the rules actually fire ---------------------------------

function selfTest() {
  const here = dirname(fileURLToPath(import.meta.url));
  const examplePath = join(here, '..', 'assets', 'publish.spec.example.json');
  const failures = [];

  const check = (label, spec, expected) => {
    const { errors } = validateSpec(spec, { checkEnv: false });
    const joined = errors.join('\n');
    if (expected === null) {
      if (errors.length) failures.push(`${label}: expected valid, got:\n  ${errors.join('\n  ')}`);
    } else if (!joined.includes(expected)) {
      failures.push(`${label}: expected an error containing "${expected}", got: ${errors.length ? joined : '(no errors)'}`);
    }
  };

  const good = JSON.parse(readFileSync(examplePath, 'utf8'));
  check('bundled example', good, null);

  const clone = () => JSON.parse(JSON.stringify(good));

  let s = clone(); delete s.cms;
  check('missing cms', s, '`cms` is required');

  s = clone(); s.transport.type = 'carrier-pigeon';
  check('unknown transport', s, 'Must be one of: git-commit, rest, cli, sdk');

  s = clone(); s.transport = { type: 'rest' };
  check('rest without baseUrl', s, '`transport.baseUrl` is required');

  s = clone(); delete s.contentTypes[0].path;
  check('git-commit type without path', s, '.path is required');

  s = clone(); s.contentTypes[0].format = 'docx';
  check('unsupported file format', s, '.format is "docx"');

  s = clone(); s.contentTypes.push(clone().contentTypes[0]);
  check('duplicate content type', s, 'is a duplicate');

  s = clone(); s.contentTypes[0].fields[0].required = 'yes';
  check('non-boolean required', s, '.required is required and must be true or false');

  s = clone(); s.contentTypes[0].fields[0].type = 'blob';
  check('unknown field type', s, '.type is "blob"');

  s = clone(); s.auth = { type: 'token' };
  check('token auth without envVars', s, '`auth.envVars` must be a non-empty array');

  s = clone(); s.contentTypes[0].fields = [];
  check('empty fields', s, '.fields is required and must be a non-empty array');

  if (failures.length) {
    for (const f of failures) console.error(`FAIL  ${f}`);
    console.error(`\n${failures.length} self-test failure(s).`);
    return 1;
  }
  console.log('OK    self-test passed (11 cases).');
  return 0;
}

// --- entry point ---------------------------------------------------------------

const arg = process.argv[2];

if (arg === '--self-test') {
  process.exit(selfTest());
}

const path = arg ?? 'cms-publish.json';
let raw;
try {
  raw = readFileSync(path, 'utf8');
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error(`ERROR No spec at ${path}. Run the writing-publish-specs skill to create one.`);
  } else {
    console.error(`ERROR Cannot read ${path}: ${err.message}`);
  }
  process.exit(1);
}

let spec;
try {
  spec = JSON.parse(raw);
} catch (err) {
  console.error(`ERROR ${path} is not valid JSON: ${err.message}`);
  process.exit(1);
}

process.exit(report(path, validateSpec(spec)));
