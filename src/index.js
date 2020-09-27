const cache = require('@actions/cache');
const core = require('@actions/core');
const github = require('@actions/github');
const md5File = require('md5-file');

async function main() {
  try {
    const paths = ['~/.npm'];
    const preKey = 'node-modules-';
    const hash = md5File.sync('package-lock.json');
    const key = preKey + hash;
    const cacheKey = await cache.restoreCache(paths, key, [preKey]);
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
