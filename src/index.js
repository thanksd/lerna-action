const cache = require('@actions/cache');
const core = require('@actions/core');
const github = require('@actions/github');

const hash = core.getInput('hash');
console.log({ hash });

const paths = ['~/.npm'];
const preKey = 'node-modules-';
const key = preKey + hash;

async function restore() {
  console.log({ paths, key, preKey });
  const cacheKey = await cache.restoreCache(paths, key, [preKey]);
  console.log({ cacheKey });
  return cacheKey;
}

async function save() {
  console.log({ paths, key });
  const cacheId = await cache.saveCache(paths, key);
  console.log({ cacheId });
  return cacheId;
}

async function logIt() {
  console.log('cache keys', Object.keys(cache));
  console.log('core keys', Object.keys(core));
  console.log('github keys', Object.keys(github));
}

async function main() {
  const cacheKey = await core.group('restore', restore);

  if (cacheKey !== key) {
    await core.group('save', save)
  }

  core.group('log stuff', logIt);
};

try {
  main();
} catch (error) {
  core.setFailed(error.message);
}
