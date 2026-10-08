/* Password accounts: the first person on an empty server becomes the admin, and only
   that admin can create the logins everyone else uses. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const API = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = crypto.randomBytes(32).toString('hex');

const freePort = () => new Promise(r => {
  const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); });
});

async function startServer(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-pass-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), SECRET, { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({ users: [], creds: [], subs: [], invites: [] }));
  const port = await freePort();
  const child = spawn(process.execPath, ['server.js'], {
    cwd: API, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost' }
  });
  const h = { api: `http://127.0.0.1:${port}`, log: '' };
  child.stdout.on('data', d => h.log += d);
  child.stderr.on('data', d => h.log += d);
  t.after(() => { child.kill('SIGKILL'); fs.rmSync(dataDir, { recursive: true, force: true }); });
  let up = false;
  for (let i = 0; i < 100 && !up; i++) {
    try { up = (await fetch(`${h.api}/api/health`)).ok; } catch { /* not up yet */ }
    if (!up) await new Promise(r => setTimeout(r, 100));
  }
  if (!up) throw new Error('server did not start\n' + h.log);
  return h;
}

const post = (h, path, body, headers) => fetch(h.api + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
});

test('the first account is the admin and can create a login', async t => {
  const h = await startServer(t);
  const cfg = await (await fetch(h.api + '/api/config')).json();
  assert.equal(cfg.setup, true);

  const setup = await post(h, '/api/password/setup', { name: 'Dizel', login: 'dizel', password: 'long-enough' });
  assert.equal(setup.status, 200);
  const admin = await setup.json();
  assert.equal(admin.user.admin, true);
  assert.equal(admin.user.login, 'dizel');
  assert.ok(admin.token);

  const again = await post(h, '/api/password/setup', { login: 'other', password: 'long-enough' });
  assert.equal(again.status, 409);

  const created = await post(h, '/api/admin/users/create', { name: 'Friend', login: 'friend', password: 'also-long' }, {
    Authorization: 'Bearer ' + admin.token
  });
  assert.equal(created.status, 200);

  const bad = await post(h, '/api/password/login', { login: 'friend', password: 'wrong-password' });
  assert.equal(bad.status, 401);

  const ok = await post(h, '/api/password/login', { login: 'Friend', password: 'also-long' });
  assert.equal(ok.status, 200);
  const friend = await ok.json();
  assert.equal(friend.user.admin, false);
  assert.equal(friend.user.name, 'Friend');

  const denied = await post(h, '/api/admin/users/create', { login: 'third', password: 'long-enough' }, {
    Authorization: 'Bearer ' + friend.token
  });
  assert.equal(denied.status, 403);
});
