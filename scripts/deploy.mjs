import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const packagePath = path.resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
const packageName = packageJson.name;
const version = packageJson.version;
const tagName = `v${version}`;
const isDryRun = process.argv.includes('--dry-run');
const otpArgumentIndex = process.argv.indexOf('--otp');
const otp = otpArgumentIndex >= 0 ? process.argv[otpArgumentIndex + 1] : process.env.NPM_OTP;

if (!packageName || !version) {
  throw new Error('package.json must define both name and version before deployment.');
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: process.env,
  });

  if (options.capture) {
    return {
      status: result.status ?? 1,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    };
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 1}.`);
  }
}

function output(command, args) {
  const result = run(command, args, { capture: true });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function ensureCleanWorkingTree() {
  const status = output('git', ['status', '--porcelain']);
  if (status) {
    throw new Error('Deployment requires a clean working tree. Commit, stash, or discard local changes first.');
  }
}

function ensureMainBranch() {
  const branch = output('git', ['branch', '--show-current']);
  if (branch !== 'main') {
    throw new Error(`Deployment must run from main, but the current branch is ${branch || '(detached HEAD)'}.`);
  }
}

function ensureRemoteIsNotAhead() {
  const counts = output('git', ['rev-list', '--left-right', '--count', 'origin/main...HEAD']).split(/\s+/).map(Number);
  const [behind = 0] = counts;
  if (behind > 0) {
    throw new Error(`origin/main is ${behind} commit(s) ahead. Pull and integrate remote changes before deployment.`);
  }
}

function localTagTarget() {
  const tag = run('git', ['rev-parse', '--verify', `${tagName}^{}`], { capture: true });
  return tag.status === 0 ? tag.stdout.trim() : null;
}

function remoteTagTarget() {
  const result = run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tagName}^{}`], { capture: true });
  if (result.status !== 0) {
    throw new Error(`Could not inspect ${tagName} on origin:\n${result.stderr || result.stdout}`);
  }

  const target = result.stdout.trim().split(/\s+/)[0];
  return target || null;
}

function packageVersionExists() {
  const result = run('npm', ['view', `${packageName}@${version}`, 'version', '--json'], { capture: true });
  if (result.status === 0) return true;
  if (result.stderr.includes('E404') || result.stdout.includes('E404')) return false;
  throw new Error(`Could not determine whether ${packageName}@${version} exists on npm:\n${result.stderr || result.stdout}`);
}

function publishArgs() {
  const args = ['publish', '--access', 'public'];
  if (otp) args.push('--otp', otp);
  return args;
}

console.log(`\n🚀 DocMeDown deployment: ${packageName}@${version}${isDryRun ? ' (dry run)' : ''}\n`);

ensureCleanWorkingTree();
ensureMainBranch();
run('git', ['fetch', 'origin', 'main']);
ensureRemoteIsNotAhead();
run('npm', ['whoami']);
run('npm', ['run', 'test:release']);

const versionAlreadyPublished = packageVersionExists();
const head = output('git', ['rev-parse', 'HEAD']);
const localTag = localTagTarget();
const remoteTag = remoteTagTarget();
const existingTagMatchesHead = localTag === head || remoteTag === head;

if ((localTag && localTag !== head) || (remoteTag && remoteTag !== head)) {
  throw new Error(`${tagName} already exists but does not point at HEAD. Bump the package version or resolve the tag before deployment.`);
}

if (isDryRun) {
  console.log(`\nDry-run summary:`);
  console.log(`  GitHub branch: ${existingTagMatchesHead ? 'would push main only' : `would create and push ${tagName}`}`);
  console.log(`  npm package: ${versionAlreadyPublished ? `${packageName}@${version} already exists; a real deploy would stop` : `would publish ${packageName}@${version}`}`);
  process.exit(0);
}

if (versionAlreadyPublished) {
  throw new Error(`${packageName}@${version} is already published. Bump package.json before deploying a new release.`);
}

run('git', ['push', 'origin', 'main']);

if (!existingTagMatchesHead) {
  run('git', ['tag', '-a', tagName, '-m', `${packageName} ${version}`]);
  run('git', ['push', 'origin', tagName]);
} else {
  if (!remoteTag) {
    run('git', ['push', 'origin', tagName]);
  } else {
    console.log(`\n✓ ${tagName} already points at HEAD; continuing a previously interrupted deployment.`);
  }
}

run('npm', publishArgs());
const publishedVersion = output('npm', ['view', `${packageName}@${version}`, 'version']);
if (publishedVersion !== version) {
  throw new Error(`npm registry verification failed: expected ${version}, received ${publishedVersion || '(empty)'}.`);
}

console.log(`\n✨ Deployment complete: ${packageName}@${version}`);