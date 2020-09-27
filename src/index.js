const cache = require('@actions/cache');
const core = require('@actions/core');
const github = require('@actions/github');

const paths = ['~/.npm'];
const preKey = 'node-modules-';
const hash = core.getInput('hash');
const key = preKey + hash;

async function restore() {
  return await cache.restoreCache(paths, key, [preKey]);
}

async function save() {
  return await cache.saveCache(paths, key);
}

async function logIt() {
  console.log('cache keys', Object.keys(cache));
  console.log('core keys', Object.keys(core));
  console.log('github keys', Object.keys(github));
}

async function main() {
  const cacheKey = await core.group('restore', restore);
  console.log({ cacheKey });

  if (cacheKey !== key) {
    const cacheId = await core.group('save', save)
    console.log({ cacheId });
  }

  core.group('log stuff', logIt);
};

try {
  main();
} catch (error) {
  core.setFailed(error.message);
}
