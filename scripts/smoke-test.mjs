import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const build = spawnSync(npmCommand, ['run', 'build'], {
  cwd: root,
  encoding: 'utf8',
  stdio: 'inherit',
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const packageJson = JSON.parse(
  readFileSync(resolve(root, 'package.json'), 'utf8'),
);
const requiredFiles = [
  resolve(root, packageJson.main),
  resolve(root, 'out/preload/index.cjs'),
  resolve(root, 'out/renderer/index.html'),
];
const missing = requiredFiles.filter((file) => !existsSync(file));

if (missing.length > 0) {
  console.error('Smoke test failed. Missing build output:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const rendererHtml = readFileSync(
  resolve(root, 'out/renderer/index.html'),
  'utf8',
);
if (!rendererHtml.includes('<div id="root"></div>')) {
  console.error('Smoke test failed. Renderer root element is missing.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const electronBinary = require('electron');
const child = spawn(electronBinary, ['.', '--smoke-test'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stdout = '';
let stderr = '';
child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk));
child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
const timeout = setTimeout(() => child.kill(), 20_000);
const exitCode = await new Promise((resolveExit) =>
  child.once('close', resolveExit),
);
clearTimeout(timeout);

if (exitCode !== 0 || !stdout.includes('SMOKE_TEST_OK')) {
  console.error(
    'Smoke test failed: Electron did not load the app and preload bridge.',
  );
  if (stdout.trim()) console.error(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
  process.exit(typeof exitCode === 'number' ? exitCode || 1 : 1);
}

console.log(
  'Smoke test passed: Electron loaded the renderer and preload bridge.',
);
