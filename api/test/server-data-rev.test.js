/* /api/data carries a server revision: GET hands it out, PUT with `baseRev` is refused (409, with
   the current document) when another write landed in between, PUT without `baseRev` overwrites
   as clients from before revisions always did. Real server.js in a child. */
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

function mintSession(uid, sv = 0) {
  const payload = `${uid}:${Date.now() + 86400000}:${sv}`;
  return payload + '.' + crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}
const headers = uid => ({ Cookie: `gymsid=${mintSession(uid)}`, 'Content-Type': 'application/json' });

const freePort = () => new Promise(r => {
  const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); });
});

async function startServer(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-rev-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), SECRET, { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
    users: [{ id: 'u_rev_1', name: 'One', created: new Date().toISOString() }], creds: [], subs: [], invites: []
  }));
  const port = await freePort();
  const child = spawn(process.execPath, ['server.js'], {
    cwd: API, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost' }
  });
  const h = { api: `http://127.0.0.1:${port}`, log: '', dataDir };
  child.stdout.on('data', d => h.log += d);
  child.stderr.on('data', d => h.log += d);
  t.after(() => { child.kill('SIGKILL'); fs.rmSync(dataDir, { recursive: true, force: true }); });
  let up = false;
  for (let i = 0; i < 100 && !up; i++) {
    try { up = (await fetch(`${h.api}/api/health`)).ok; } catch { /* not up yet */ }
    if (!up) await new Promise(r => setTimeout(r, 100));
  }
  assert.ok(up, `server never came up:\n${h.log}`);
  return h;
}

test('GET/PUT /api/data: revisions, conditional writes and the legacy overwrite', async t => {
  const h = await startServer(t);
  const uid = 'u_rev_1';
  const get = async () => { const r = await fetch(`${h.api}/api/data`, { headers: headers(uid) }); return { status: r.status, body: await r.json() }; };
  const put = async body => { const r = await fetch(`${h.api}/api/data`, { method: 'PUT', headers: headers(uid), body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
  const onDisk = () => JSON.parse(fs.readFileSync(path.join(h.dataDir, `state-${uid}.json`), 'utf8'));

  // nothing synced yet
  let r = await get();
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { state: null, rev: 0 });

  // first write against rev 0
  r = await put({ state: { _ts: 100, workouts: [{ id: 'w1', d: '2026-09-01' }], routines: [], active: { id: 'running' } }, baseRev: 0 });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.rev, 1);
  assert.equal(r.body.ts, 100);
  assert.equal(onDisk()._rev, 1);
  assert.equal('active' in onDisk(), false, 'active is stripped');

  r = await get();
  assert.equal(r.body.rev, 1);
  assert.equal(r.body.state._rev, 1);
  assert.deepEqual(r.body.state.workouts.map(w => w.id), ['w1']);

  // the same baseRev again — someone else already wrote rev 1 — is a conflict, and the current
  // document comes back with it
  r = await put({ state: { _ts: 200, workouts: [], routines: [] }, baseRev: 0 });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'conflict');
  assert.equal(r.body.rev, 1);
  assert.deepEqual(r.body.state.workouts.map(w => w.id), ['w1']);
  assert.deepEqual(onDisk().workouts.map(w => w.id), ['w1'], 'a refused write changes nothing');

  // a client from before revisions sends no baseRev and overwrites, as it always did
  r = await put({ state: { _ts: 300, workouts: [{ id: 'w2', d: '2026-09-02' }], routines: [] } });
  assert.equal(r.status, 200);
  assert.equal(r.body.rev, 2);
  assert.deepEqual(onDisk().workouts.map(w => w.id), ['w2']);

  // a matching baseRev goes through; a client-supplied _rev is ignored
  r = await put({ state: { _ts: 400, _rev: 99, workouts: [{ id: 'w3', d: '2026-09-03' }], routines: [] }, baseRev: 2 });
  assert.equal(r.status, 200);
  assert.equal(r.body.rev, 3);
  assert.equal(onDisk()._rev, 3);

  // an explicit null is "no baseRev", not "rev null"
  r = await put({ state: { _ts: 500, workouts: [], routines: [] }, baseRev: null });
  assert.equal(r.status, 200);
  assert.equal(r.body.rev, 4);

  // a baseRev that is a string never matches (no coercion)
  r = await put({ state: { _ts: 600, workouts: [], routines: [] }, baseRev: '4' });
  assert.equal(r.status, 409);

  // the shape check still comes first
  r = await put({ state: { workouts: 'nope' }, baseRev: 4 });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'invalid state');
  assert.equal(onDisk()._rev, 4);
});

test('PUT /api/data keeps a plan that was saved later than the copy being pushed', async t => {
  const h = await startServer(t);
  const uid = 'u_rev_1';
  const headersFor = headers(uid);
  const put = async body => {
    const r = await fetch(`${h.api}/api/data`, { method: 'PUT', headers: headersFor, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  const onDisk = () => JSON.parse(fs.readFileSync(path.join(h.dataDir, `state-${uid}.json`), 'utf8'));
  const saved = { id: 'r1', name: 'Жим', editedAt: 500, ex: [{ id: '0025', sets: 5, weight: 80, sec: 45 }] };
  const stale = { id: 'r1', name: 'Жим', ex: [{ id: '0025', sets: 3, weight: 60, sec: 30 }] };

  let r = await put({ state: { _ts: 100, workouts: [], routines: [saved] }, baseRev: 0 });
  assert.equal(r.status, 200);
  assert.equal(r.body.state, undefined, 'an ordinary write does not echo the document');

  r = await put({ state: { _ts: 900, workouts: [{ id: 'w-phone', d: '2026-11-08' }], routines: [stale] }, baseRev: 1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.rev, 2);
  assert.deepEqual(onDisk().routines[0].ex[0], saved.ex[0]);
  assert.equal(onDisk().workouts[0].id, 'w-phone', 'the phone workout still lands');
  assert.deepEqual(r.body.state.routines[0].ex[0], saved.ex[0]);

  // a backup import sends no baseRev and is allowed to replace the plan
  r = await put({ state: { _ts: 1000, workouts: [], routines: [stale] } });
  assert.equal(r.status, 200);
  assert.equal(onDisk().routines[0].ex[0].weight, 60);
});
