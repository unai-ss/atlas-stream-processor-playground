import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const setup = readFileSync(path.join(sourceRoot, 'tracks/asp-foundations/track_scripts/setup-workstation'), 'utf8');
const runtimeFiles = [
  'instruqt/tracks/asp-foundations/bin/asp-shell',
  'instruqt/tracks/asp-foundations/bin/atlas-shell',
  'instruqt/tracks/asp-foundations/bin/check-atlas-access',
  'projects/01-fast-start/processor.js',
  'projects/02-taco-tracking/processor.js',
  'projects/08-parallelism/processor-change-stream.js',
  'scripts/08-seed-parallelism.js'
];

function runSetup({ missingFile } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'asp-setup-test-'));
  try {
    writeFileSync(path.join(root, 'bootstrap'), '');
    for (const file of runtimeFiles) {
      if (file === missingFile) continue;
      const target = path.join(root, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, 'fixture');
    }
    const stubs = `
atlas() { :; }
jq() { :; }
mongosh() { :; }
`;
    const script = setup
      .replace('/opt/instruqt/bootstrap/host-bootstrap-completed', path.join(root, 'bootstrap'))
      .replaceAll('/opt/asp-playground', root);
    return spawnSync('bash', ['-s'], { input: stubs + script, encoding: 'utf8' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('prepared image starts without downloads, Docker, or GitHub credentials', () => {
  const result = runSetup();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /no startup downloads or Docker required/);
  assert.doesNotMatch(setup, /git clone|apt-get|docker|INSTRUQT_GITHUB_READ_TOKEN/);
});

test('missing runtime file fails with rebuild instructions', () => {
  const result = runSetup({ missingFile: runtimeFiles[3] });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing image file: projects\/01-fast-start\/processor.js/);
});

test('runtime bundle includes required source but no repository, Kafka broker, or secret files', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'asp-bundle-test-'));
  try {
    const archive = path.join(root, 'runtime.tar.gz');
    const packaged = spawnSync('bash', [path.join(sourceRoot, 'image/package-runtime'), archive], { encoding: 'utf8' });
    assert.equal(packaged.status, 0, packaged.stderr);
    const listing = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
    assert.equal(listing.status, 0, listing.stderr);
    const entries = listing.stdout.trim().split('\n');
    for (const entry of entries) {
      assert.match(entry, /^(image\/prepare-host|tracks\/asp-foundations\/bin\/.*|projects\/(01-fast-start\/processor.js|02-taco-tracking\/processor.js|08-parallelism\/processor-change-stream.js)|scripts\/08-seed-parallelism.js)$/);
    }
    for (const file of runtimeFiles) {
      assert.ok(entries.includes(file.replace(/^instruqt\//, '')), `Missing ${file}`);
    }
    assert.doesNotMatch(listing.stdout, /(^|\/)secret$|\.env|\.git\//m);
    assert.doesNotMatch(listing.stdout, /04-late-data-join|bootstrap-kafka|kafka-produce/);
    const repeated = spawnSync('bash', [path.join(sourceRoot, 'image/package-runtime'), archive], { encoding: 'utf8' });
    assert.equal(repeated.status, 1);
    assert.match(repeated.stderr, /Refusing to overwrite/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});