const cache = require('@actions/cache');
const core = require('@actions/core');
const github = require('@actions/github');

try {
  const cacheKey = await cache.restoreCache(
    ['~/.npm'],
    "${{ runner.os }}-node-modules-${{ hashFiles('package-lock.json') }}",
    ["${{ runner.os }}-node-modules-"]
  );
  console.log({ cacheKey });

  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${payload}`)
} catch (error) {
  core.setFailed(error.message)
}
