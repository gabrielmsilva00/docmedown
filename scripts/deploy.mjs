import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { incrementPatchVersion, listOutputLines, localIsoDate, promoteChangelog } from "./deploy-lib.mjs";

const packagePath = path.resolve(process.cwd(), "package.json");
const changelogPath = path.resolve(process.cwd(), "CHANGELOG.md");
const npmCliPath =
  process.env.npm_execpath || path.resolve(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
const isDryRun = process.argv.includes("--dry-run");
const otpArgumentIndex = process.argv.indexOf("--otp");
const otp = otpArgumentIndex >= 0 ? process.argv[otpArgumentIndex + 1] : process.env.NPM_OTP;

if (!fs.existsSync(npmCliPath)) throw new Error(`Could not locate npm's JavaScript CLI at ${npmCliPath}.`);

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf-8",
    stdio: options.capture ? "pipe" : "inherit",
    env: process.env,
  });

  if (options.capture) {
    return { status: result.status ?? 1, stdout: result.stdout || "", stderr: result.stderr || "" };
  }
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}.`);
}

function output(command, args) {
  const result = run(command, args, { capture: true });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function runNpm(args, options) {
  return run(process.execPath, [npmCliPath, ...args], options);
}

function readPackage() {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
  if (!packageJson.name || !packageJson.version) {
    throw new Error("package.json must define both name and version before deployment.");
  }
  return packageJson;
}

function ensureMainBranch() {
  const branch = output("git", ["branch", "--show-current"]);
  if (branch !== "main")
    throw new Error(`Deployment must run from main, but the current branch is ${branch || "(detached HEAD)"}.`);
}

function readRemoteCounts() {
  const [behind = 0, ahead = 0] = output("git", ["rev-list", "--left-right", "--count", "origin/main...HEAD"])
    .split(/\s+/)
    .map(Number);
  if (behind > 0)
    throw new Error(`origin/main is ${behind} commit(s) ahead. Pull and integrate remote changes before deployment.`);
  return { behind, ahead };
}

function ensureSafeWorkingTree() {
  const conflicts = listOutputLines(output("git", ["diff", "--name-only", "--diff-filter=U"]));
  if (conflicts.length > 0) throw new Error(`Resolve merge conflicts before deployment:\n${conflicts.join("\n")}`);

  const untracked = listOutputLines(output("git", ["ls-files", "--others", "--exclude-standard"]));
  if (untracked.length > 0) {
    throw new Error(
      `Deployment will not auto-commit untracked files. Add, ignore, or remove these files first:\n${untracked.join("\n")}`,
    );
  }
}

function hasTrackedChanges() {
  return Boolean(output("git", ["status", "--porcelain", "--untracked-files=no"]));
}

function localTagTarget(tagName) {
  const tag = run("git", ["rev-parse", "--verify", `${tagName}^{}`], { capture: true });
  return tag.status === 0 ? tag.stdout.trim() : null;
}

function remoteTagTarget(tagName) {
  const result = run("git", ["ls-remote", "--tags", "origin", `refs/tags/${tagName}^{}`], { capture: true });
  if (result.status !== 0)
    throw new Error(`Could not inspect ${tagName} on origin:\n${result.stderr || result.stdout}`);
  return result.stdout.trim().split(/\s+/)[0] || null;
}

function packageVersionExists(packageName, version) {
  const result = runNpm(["view", `${packageName}@${version}`, "version", "--json"], { capture: true });
  if (result.status === 0) return true;
  if (result.stderr.includes("E404") || result.stdout.includes("E404")) return false;
  throw new Error(
    `Could not determine whether ${packageName}@${version} exists on npm:\n${result.stderr || result.stdout}`,
  );
}

function publishArgs() {
  const args = ["publish", "--access", "public"];
  if (otp) args.push("--otp", otp);
  return args;
}

function prepareVersion(nextVersion) {
  const changelog = fs.readFileSync(changelogPath, "utf-8");
  const promoted = promoteChangelog(changelog, nextVersion, localIsoDate());
  runNpm(["version", nextVersion, "--no-git-tag-version"]);
  fs.writeFileSync(changelogPath, promoted);
}

function commitTrackedRelease(version) {
  run("git", ["add", "-u"]);
  const staged = output("git", ["diff", "--cached", "--name-only"]);
  if (!staged) throw new Error("Deployment expected tracked release changes, but nothing was staged.");
  run("git", ["commit", "-m", `chore(release): v${version}`]);
}

function verifyPublishedVersion(packageName, version) {
  const attempts = 8;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = runNpm(["view", `${packageName}@${version}`, "version"], { capture: true });
    if (result.status === 0 && result.stdout.trim() === version) return;
    if (attempt < attempts) {
      console.log(`\nRegistry metadata has not propagated yet; retrying in 5 seconds (${attempt}/${attempts})...`);
      run(process.execPath, ["-e", "setTimeout(() => {}, 5000)"]);
    }
  }
  throw new Error(`npm registry verification did not return ${packageName}@${version} after ${attempts} attempts.`);
}

ensureMainBranch();
run("git", ["fetch", "origin", "main"]);
const initialRemote = readRemoteCounts();
ensureSafeWorkingTree();
runNpm(["whoami"]);

let packageJson = readPackage();
let packageName = packageJson.name;
let version = packageJson.version;
let tagName = `v${version}`;
let head = output("git", ["rev-parse", "HEAD"]);
let localTag = localTagTarget(tagName);
let remoteTag = remoteTagTarget(tagName);
let versionAlreadyPublished = packageVersionExists(packageName, version);
const trackedChanges = hasTrackedChanges();
const currentReleaseMatchesHead = localTag === head || remoteTag === head;
const needsPatchBump =
  (trackedChanges || !currentReleaseMatchesHead) && Boolean(versionAlreadyPublished || localTag || remoteTag);
const plannedVersion = needsPatchBump ? incrementPatchVersion(version) : version;

console.log(`\n🚀 DocMeDown deployment: ${packageName}@${plannedVersion}${isDryRun ? " (dry run)" : ""}\n`);

if (isDryRun) {
  runNpm(["run", "test:release"]);
  console.log("\nDry-run summary:");
  console.log(`  Tracked changes: ${trackedChanges ? "would validate and auto-commit" : "none"}`);
  console.log(`  Version: ${needsPatchBump ? `would bump ${version} → ${plannedVersion}` : `would keep ${version}`}`);
  console.log(
    `  GitHub: would ${initialRemote.ahead > 0 ? "push existing commits and " : ""}push main and v${plannedVersion}`,
  );
  console.log(`  npm: would publish ${packageName}@${plannedVersion}`);
  process.exit(0);
}

if (!trackedChanges && versionAlreadyPublished && remoteTag === head && initialRemote.ahead === 0) {
  console.log(`\n✓ ${packageName}@${version} is already fully deployed.`);
  process.exit(0);
}

if (needsPatchBump) {
  prepareVersion(plannedVersion);
  packageJson = readPackage();
  version = packageJson.version;
  tagName = `v${version}`;
  packageName = packageJson.name;
  versionAlreadyPublished = false;
  localTag = null;
  remoteTag = null;
}

runNpm(["run", "test:release"]);
ensureSafeWorkingTree();
if (hasTrackedChanges()) commitTrackedRelease(version);

head = output("git", ["rev-parse", "HEAD"]);
localTag = localTagTarget(tagName);
remoteTag = remoteTagTarget(tagName);
const existingTagMatchesHead = localTag === head || remoteTag === head;
if ((localTag && localTag !== head) || (remoteTag && remoteTag !== head)) {
  throw new Error(
    `${tagName} already exists but does not point at HEAD. Bump the package version or resolve the tag before deployment.`,
  );
}

versionAlreadyPublished = packageVersionExists(packageName, version);
run("git", ["push", "origin", "main"]);

if (!existingTagMatchesHead) {
  run("git", ["tag", "-a", tagName, "-m", `${packageName} ${version}`]);
  run("git", ["push", "origin", tagName]);
} else if (!remoteTag) {
  run("git", ["push", "origin", tagName]);
} else {
  console.log(`\n✓ ${tagName} already points at HEAD; continuing a previously interrupted deployment.`);
}

if (!versionAlreadyPublished) runNpm(publishArgs());
else console.log(`\n✓ ${packageName}@${version} is already published; verifying the registry.`);

verifyPublishedVersion(packageName, version);
console.log(`\n✨ Deployment complete: ${packageName}@${version}`);
