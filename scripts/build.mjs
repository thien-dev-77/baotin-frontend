import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const BUILD_POOL_SIZE = "1";

// Set native pool sizes before Next/SWC starts, including all forked workers.
// Keep the host's other settings, such as NODE_OPTIONS and application env.
const result = spawnSync(process.execPath, [
  require.resolve("next/dist/bin/next"),
  "build",
  "--webpack",
  ...process.argv.slice(2),
], {
  stdio: "inherit",
  env: {
    ...process.env,
    TOKIO_WORKER_THREADS: BUILD_POOL_SIZE,
    RAYON_NUM_THREADS: BUILD_POOL_SIZE,
    UV_THREADPOOL_SIZE: BUILD_POOL_SIZE,
    NEXT_WEBPACK_PARALLELISM: BUILD_POOL_SIZE,
  },
});

if (result.error) console.error("Unable to start Next.js build:", result.error.message);
if (result.signal) process.kill(process.pid, result.signal);
process.exitCode = result.status ?? 1;
