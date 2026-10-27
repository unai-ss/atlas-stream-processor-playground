import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const setup = readFileSync(path.join(sourceRoot, 'tracks/asp-foundations/track_scripts/setup-workstation'), 'utf8');
const imagePreparation = readFileSync(path.join(sourceRoot, 'image/prepare-host'), 'utf8');
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
    const sourceTree = path.join(root, 'source-tree');
    const archive = path.join(root, 'source.tar.gz');
    const installRoot = path.join(root, 'install');
    writeFileSync(path.join(root, 'bootstrap'), '');
    for (const file of runtimeFiles) {
      if (file === missingFile) continue;
      const target = path.join(sourceTree, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, 'fixture');
    }
    writeFileSync(path.join(sourceTree, '.env'), 'must not be installed');
    writeFileSync(path.join(sourceTree, 'secret'), 'must not be installed');
    const archived = spawnSync('tar', ['-czf', archive, '-C', root, 'source-tree'], { encoding: 'utf8' });
    assert.equal(archived.status, 0, archived.stderr);
    const stubs = `
  apt-get() { echo 'Unexpected package install during sandbox startup' >&2; return 99; }
atlas() { :; }
jq() { :; }
mongosh() { :; }
GITHUB_ARCHIVE_FIXTURE='${archive}'
curl() { cp "$GITHUB_ARCHIVE_FIXTURE" "$archive_path"; }
`;
    const script = setup
      .replace('/opt/instruqt/bootstrap/host-bootstrap-completed', path.join(root, 'bootstrap'))
      .replaceAll('/opt/asp-playground', installRoot);
    const result = spawnSync('bash', ['-s'], { input: stubs + script, encoding: 'utf8' });
    return {
      result,
      installedFiles: runtimeFiles.filter((file) => existsSync(path.join(installRoot, file))),
      installedSecret: existsSync(path.join(installRoot, 'secret')) || existsSync(path.join(installRoot, '.env'))
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('custom-image setup downloads the pinned public source without installing packages, Docker, or credentials', () => {
  const { result } = runSetup();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /runtime files downloaded from public revision/);
  assert.match(setup, /https:\/\/codeload\.github\.com\/unai-ss\/atlas-stream-processor-playground\/tar\.gz/);
  assert.match(setup, /source_revision="[a-f0-9]{40}"/);
  assert.doesNotMatch(setup, /apt-get|mongodb-atlas-cli|mongodb-mongosh|git clone|docker run|docker pull|INSTRUQT_GITHUB_READ_TOKEN/);
});

test('Host image preparation installs required tools once without Docker or Atlas credentials', () => {
  assert.match(imagePreparation, /apt-get install -y -qq ca-certificates curl gnupg jq tar/);
  assert.match(imagePreparation, /mongodb-atlas-cli mongodb-mongosh/);
  assert.match(imagePreparation, /Run this script as root/);
  assert.doesNotMatch(imagePreparation, /docker pull|docker run|atlas auth login/);
  const syntax = spawnSync('bash', ['-n', path.join(sourceRoot, 'image/prepare-host')], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test('missing runtime file fails with rebuild instructions', () => {
  const { result } = runSetup({ missingFile: runtimeFiles[3] });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing runtime file in public source revision [a-f0-9]{40}: projects\/01-fast-start\/processor.js/);
});

test('track setup installs only required runtime files from the downloaded archive', () => {
  const { result, installedFiles, installedSecret } = runSetup();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(installedFiles, runtimeFiles);
  assert.equal(installedSecret, false);
});
