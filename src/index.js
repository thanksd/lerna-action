const cache = require('@actions/cache');
const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
  const paths = ['~/.npm'];
  const preKey = 'node-modules-';
  const key = preKey + 'hash';
  const cacheKey = await cache.restoreCache(paths, key, [preKey]);
  console.log({ cacheKey });

  if (cacheKey !== key) {
    const cacheId = await cache.saveCache(paths, key);
    console.log({ cacheId });
  }

  console.log('cache keys', Object.keys(cache));
  console.log('core keys', Object.keys(core));
  console.log('github keys', Object.keys(github));
};

try {
  main();
} catch (error) {
  core.setFailed(error.message);
}
