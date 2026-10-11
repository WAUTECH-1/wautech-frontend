import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const vite = resolve('node_modules/vite/bin/vite.js');
const servers = [];
function start(developer) {
  const child = spawn(process.execPath, [vite], {
    cwd: resolve('workspaces', developer),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', (data) => (output += data));
  child.stderr.on('data', (data) => (output += data));
  servers.push(child);
  return { child, output: () => output };
}

try {
  for (const [index, developer] of ['wajahat', 'asad', 'umer'].entries()) {
    const port = 5173 + index;
    const server = start(developer);
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      assert.equal(server.child.exitCode, null, server.output());
      if (server.output().includes(`localhost:${port}`)) {
        ready = true;
        break;
      }
      await delay(100);
    }
    assert.ok(ready, server.output());
    const html = await fetch(`http://localhost:${port}`).then((r) => r.text());
    assert.ok(html.includes('/src/main.tsx'));
    const app = await fetch(`http://localhost:${port}/src/App.tsx`).then((r) =>
      r.text(),
    );
    const name = developer[0].toUpperCase() + developer.slice(1);
    assert.ok(app.includes(`WAUTECH Intelligence — ${name} Workspace`));
    const duplicate = start(developer);
    const [code] = await Promise.race([
      once(duplicate.child, 'exit'),
      delay(10000).then(() => {
        throw new Error('Port collision did not exit');
      }),
    ]);
    assert.notEqual(code, 0);
    assert.ok(duplicate.output().includes(`Port ${port} is already in use`));
    console.log(
      `${developer}: served on ${port}; duplicate server correctly rejected`,
    );
  }
} finally {
  for (const child of servers) {
    if (child.exitCode === null) child.kill();
  }
}
