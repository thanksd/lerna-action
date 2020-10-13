const cache = require('@actions/cache');
const core = require('@actions/core');
const github = require('@actions/github');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const rootCache = core.getInput('root-cache');
const packagesCache = core.getInput('packages-cache');
const thenPublish = core.getInput('then-publish');
const gitEmail = core.getInput('git-email');
const gitName = core.getInput('git-name');
const npmRegistry = core.getInput('npm-registry');

const preKey = 'lerna-action-';
const rootPaths = ['~/.npm'];
const rootPreKey = preKey + 'root-';
const rootKey = rootPreKey + rootCache;
const packagesPaths = ['node_modules', '*/*/node_modules'];
const packagesPreKey = preKey + 'packages-';
const packagesKey = packagesPreKey + packagesCache;

function log(text) {
  core.info(JSON.stringify(text, null, 2));
}

async function restoreRoot() {
  log({ rootPaths, rootKey, rootPreKey });
  const cacheKey = await cache.restoreCache(rootPaths, rootKey, []);
  log({ cacheKey });
  return cacheKey;
}

async function saveRoot() {
  log({ rootPaths, rootKey });
  const cacheId = await cache.saveCache(rootPaths, rootKey);
  log({ cacheId });
  return cacheId;
}

async function restorePackages() {
  log({ packagesPaths, packagesKey, packagesPreKey });
  const cacheKey = await cache.restoreCache(packagesPaths, packagesKey, []);
  log({ cacheKey });
  return cacheKey;
}

async function savePackages() {
  log({ packagesPaths, packagesKey });
  const cacheId = await cache.saveCache(packagesPaths, packagesKey);
  log({ cacheId });
  return cacheId;
}

async function install() {
  const { stdout } = await exec('npm i');
  log(stdout);
}

async function bootstrap() {
  const { stdout } = await exec('npx lerna bootstrap');
  log(stdout);
}

async function logIt() {
  const { stdout } = await exec('ls node_modules/.bin');
  log(stdout);
  log({ cache: Object.keys(cache) });
  log({ core: Object.keys(core) });
  log({ github: github.context });
}

async function gitConfig(head) {
  if (gitEmail) {
    await exec(`git config --global user.email "${gitEmail}"`);
  }
  if (gitName) {
    await exec(`git config --global user.name "${gitName}"`);
  }
  if (head) {
    await exec(`git fetch origin ${head} --depth=1 && git checkout ${head} --`);
  }
}

async function npmConfig() {
  await exec('touch .npmrc');
  if (npmRegistry) {
    const regex = /^https?:\/\//;
    const parts = npmRegistry.split(regex);
    const registry = parts[parts.length - 1]; // remove https or http if it exists
    const base = registry.split('/')[0]; // get the base url to use for auth
    await exec(`echo "registry=https://${registry}" >> .npmrc`);
    await exec(`echo "//${base}/:_authToken=$NPM_TOKEN" >> .npmrc`);
    const { stdout } = await exec(`cat .npmrc`);
    log(stdout);
  }
}

async function publish() {
  const { event_name: name, event: e, ref, head_ref: head } = github.context || {};
  await gitConfig(head);
  await npmConfig();
  const merged = e && e.pull_request && e.pull_request.merged === 'true';
  const pushOrMerge = (name === 'push' || merged);

  let version;
  if (name === 'pull_request') {
    version = 'prerelease';
  } else if (ref === 'refs/heads/develop' && pushOrMerge) {
    version = 'patch';
  } else if (ref === 'refs/heads/master' && pushOrMerge) {
    version = 'minor';
  }
  if (version) {
    await exec(`npx lerna version ${version} -y && npx lerna publish from-git -y`);
  }
}

async function main() {
  const foundRoot = await core.group('restore root', restoreRoot);
  const foundPackages = await core.group('restore packages', restorePackages);

  if (!foundRoot || !foundPackages) {
    await core.group('install', install);
  }

  if (!foundPackages) {
    await core.group('bootstrap', bootstrap);
    await core.group('save packages', savePackages);
  }

  if (!foundRoot) {
    await core.group('save root', saveRoot);
  }

  if (thenPublish === 'Y') {
    try {
      await core.group('publish', publish);
    } catch (e) {
      log(e);
    }
  }

  core.group('log stuff', logIt);
};

try {
  main();
} catch (error) {
  core.setFailed(error.message);
}
