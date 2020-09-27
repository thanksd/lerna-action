const cache = require('@actions/cache');
const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
  try {
    const cacheKey = await cache.restoreCache(
      ['~/.npm'],
      "${{ runner.os }}-node-modules-${{ hashFiles('package-lock.json') }}",
      ["${{ runner.os }}-node-modules-"]
    );
    console.log({ cacheKey });

    const payload = JSON.stringify(github.context, undefined, 2);
    console.log(`The github context: ${payload}`)
  } catch (error) {
    core.setFailed(error.message)
  }
};

main();
