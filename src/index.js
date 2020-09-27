const cache = require('@actions/cache');
const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
  try {
    const paths = ['~/.npm'];
    const preKey = 'os-node-modules-';
    const key = preKey + '${{ hashFiles("package-lock.json") }}';
    const cacheKey = await cache.restoreCache(paths, key, [preKey]);
      // ["${{ runner.os }}-node-modules-"]
    console.log({ cacheKey });

    if (cacheKey !== key) {
      const cacheId = await cache.saveCache(paths, key);
      console.log({ cacheId });
    }
  } catch (error) {
    core.setFailed(error.message)
  }
};

main();
