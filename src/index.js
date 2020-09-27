const cache = require('@actions/cache');
const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
  try {
    const cacheKey = await cache.restoreCache(
      ['~/.npm'],
      'os-node-modules-testkey',
      ['os-node-modules-']
      // "${{ runner.os }}-node-modules-${{ hashFiles('package-lock.json') }}",
      // ["${{ runner.os }}-node-modules-"]
    );
    console.log({ cacheKey });

    const payload = JSON.stringify(github, undefined, 2);
    console.log(`The github object: ${payload}`)
  } catch (error) {
    core.setFailed(error.message)
  }
};

main();
