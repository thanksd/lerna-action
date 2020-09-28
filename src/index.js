const cache = require('@actions/cache');
const core = require('@actions/core');
const github = require('@actions/github');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const rootCache = core.getInput('root-cache');
const packagesCache = core.getInput('packages-cache');

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
  const cacheKey = await cache.restoreCache(rootPaths, rootKey, [rootPreKey]);
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
  const cacheKey = await cache.restoreCache(packagesPaths, packagesKey, [packagesPreKey]);
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
  exec('npm i');
}

async function bootstrap() {
  exec('npx lerna bootstrap');
}

async function logIt() {
  const { stdout: outA } = await exec('ls node_modules');
  const { stdout: outB } = await exec('ls node_modules/.bin');
  log(outA);
  log(outB);
  log({ cache: Object.keys(cache) });
  log({ core: Object.keys(core) });
  log({ github: Object.keys(github) });
}

async function main() {
  const key1 = await core.group('restore root', restoreRoot);
  const foundRoot = key1 === rootKey;

  const key2 = await core.group('restore packages', restorePackages);
  const foundPackages = key2 === packagesKey;

  if (!foundRoot || !foundPackages) {
    await core.group('install', install);
  }

  if (!foundPackages) {
    await core.group('bootstrap', bootstrap);
    await core.group('save packages', savePackages);
  }

  if (!foundRoot) {
    await core.group('save root', saveRoot)
  }

  core.group('log stuff', logIt);
};

try {
  main();
} catch (error) {
  core.setFailed(error.message);
}
