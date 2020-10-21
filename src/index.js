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

  const ref = head || '';
  await exec(`git fetch origin ${ref} --depth=1 && git checkout ${ref} --`);
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
  }
  const { stdout } = await exec(`cat .npmrc`);
  log(stdout);
}

async function publish() {
  const { eventName: name, payload: e, ref } = github.context || {};
  const head = e && e.pull_request && e.pull_request.head || {};
  log({ name, payload: e, ref, head });

  await gitConfig(head.ref);
  await npmConfig();
  const merged = e && e.pull_request && e.pull_request.merged === 'true';
  const pushOrMerge = (name === 'push' || merged);
  log({ merged, pushOrMerge });

  let version;
  if (name === 'pull_request') {
    version = 'prerelease';
    const { stdout: lernaVersion } = await exec(`cat lerna.json | jq -r '.version' | cut -d "-" -f 1`);
    const { stdout: hash } = await exec(`git rev-parse --short HEAD`);
    version = `${lernaVersion}-${hash}`.replace(/[\n\r]+/g, '');
  } else if (ref === 'refs/heads/develop' && pushOrMerge) {
    version = 'patch';
  } else if (ref === 'refs/heads/master' && pushOrMerge) {
    version = 'minor';
  }
  log({ version });

  if (version) {
    const options = name === 'pull_request' ? '--no-push' : '';
    await exec(`npx lerna version ${version} ${options} -y`);
    await exec(`npx lerna publish from-git --ignore-scripts -y`);
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
