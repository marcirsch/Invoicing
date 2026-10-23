import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(
  await readFile(path.join(root, 'package.json'), 'utf8'),
);
const executableName = packageJson.productName;
const outputDirectory = path.join(root, 'release');
const packageEntry = (await readdir(outputDirectory, { withFileTypes: true }))
  .filter(
    (entry) =>
      entry.isDirectory() &&
      entry.name.endsWith(`-${process.platform}-${process.arch}`),
  )
  .map((entry) => entry.name)
  .sort()
  .at(-1);
if (!packageEntry)
  throw new Error(
    `No packaged ${process.platform}/${process.arch} app was found under release/.`,
  );
const packageDirectory = path.join(outputDirectory, packageEntry);
const appBundle = path.join(packageDirectory, `${packageJson.productName}.app`);
const executable =
  process.platform === 'darwin'
    ? path.join(appBundle, 'Contents', 'MacOS', executableName)
    : path.join(
        packageDirectory,
        `${executableName}${process.platform === 'win32' ? '.exe' : ''}`,
      );
const userDataPath = await mkdtemp(
  path.join(os.tmpdir(), 'local-invoicing-smoke-'),
);
const resultPath = path.join(userDataPath, 'smoke-result.txt');

try {
  const launchCommand =
    process.platform === 'darwin' ? '/usr/bin/open' : executable;
  const launchArguments =
    process.platform === 'darwin'
      ? [
          '-W',
          '-a',
          appBundle,
          '--args',
          '--smoke-test',
          `--smoke-user-data-path=${userDataPath}`,
          `--smoke-result-path=${resultPath}`,
        ]
      : ['--smoke-test'];
  const child = spawn(launchCommand, launchArguments, {
    cwd: packageDirectory,
    env: {
      ...process.env,
      INVOICING_TEST_USER_DATA_PATH: userDataPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk));
  child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
  const timeout = setTimeout(() => child.kill(), 30_000);
  const exitResult = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolveExit({ code, signal }));
  }).finally(() => clearTimeout(timeout));
  const resultMessage =
    process.platform === 'darwin'
      ? await readFile(resultPath, 'utf8').catch(() => '')
      : stdout.trim();

  if (exitResult.code !== 0 || resultMessage !== 'SMOKE_TEST_OK') {
    console.error(
      `Packaged smoke test failed (exit ${String(exitResult.code)}, signal ${String(exitResult.signal)}): renderer or preload bridge did not initialize.`,
    );
    if (stdout.trim()) console.error(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
    if (resultMessage) console.error(resultMessage);
    process.exitCode = 1;
  } else {
    console.log(
      `Packaged smoke test passed (${process.platform}/${process.arch}); isolated user data was used.`,
    );
  }
} catch (error) {
  console.error(`Packaged smoke test could not launch ${executable}.`);
  console.error(error);
  process.exitCode = 1;
} finally {
  await rm(userDataPath, { recursive: true, force: true });
}
