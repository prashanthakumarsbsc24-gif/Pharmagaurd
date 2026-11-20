// Integration tests: run against a real MongoDB (default: local, database "pharmaguard_test").
//   npm test            (needs MongoDB running; set TEST_MONGODB_URI to override)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const http = require('node:http');

const app = require('../app');
const AuditLog = require('../models/AuditLog');

let server, base;
const api = async (method, path, { token, body } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const batch = (over = {}) => ({
  medicationName: 'Dolo 650', batchNumber: 'L1', price: 30.5, quantity: 100, unitsSold: 10,
  expirationDate: '2030-01-31', storage: 'Room temp (15–25°C)', ...over,
});

let alice, bob;

before(async () => {
  await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/pharmaguard_test');
  await mongoose.connection.dropDatabase();
  await Promise.all(mongoose.modelNames().map((m) => mongoose.model(m).init()));
  server = http.createServer(app).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

test('meta options list regions with currencies', async () => {
  const { status, body } = await api('GET', '/api/meta/options');
  assert.equal(status, 200);
  assert.equal(body.defaultRegion, 'IN');
  assert.equal(body.regions.find((r) => r.code === 'IN').currency, 'INR');
  assert.equal(body.regions.find((r) => r.code === 'US').currency, 'USD');
});

test('register validates input and defaults to India', async () => {
  assert.equal((await api('POST', '/api/auth/register', { body: { username: 'ab', password: 'longenough1' } })).status, 400);
  assert.equal((await api('POST', '/api/auth/register', { body: { username: 'alice', password: 'short' } })).status, 400);
  assert.equal((await api('POST', '/api/auth/register', { body: { username: 'alice', password: 'longenough1', region: 'ZZ' } })).status, 400);
  const ok = await api('POST', '/api/auth/register', { body: { username: 'Alice', password: 'longenough1' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.user.region, 'IN');
  alice = ok.body.token;
  const dup = await api('POST', '/api/auth/register', { body: { username: 'ALICE', password: 'longenough1' } });
  assert.equal(dup.status, 409, 'usernames are case-insensitive');
  const b = await api('POST', '/api/auth/register', { body: { username: 'bob', password: 'longenough1', region: 'US' } });
  bob = b.body.token;
  assert.equal(b.body.user.region, 'US');
});

test('login: wrong password, operator injection and success', async () => {
  assert.equal((await api('POST', '/api/auth/login', { body: { username: 'alice', password: 'nope-nope' } })).status, 401);
  assert.equal((await api('POST', '/api/auth/login', { body: { username: { $ne: null }, password: { $ne: null } } })).status, 400);
  const ok = await api('POST', '/api/auth/login', { body: { username: 'alice', password: 'longenough1' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
});

test('protected routes need a valid token', async () => {
  assert.equal((await api('GET', '/api/batches')).status, 401);
  assert.equal((await api('GET', '/api/batches', { token: 'garbage' })).status, 401);
});

test('batch CRUD with validation and duplicate protection', async () => {
  const bad = await api('POST', '/api/batches', { token: alice, body: batch({ expirationDate: '2030-02-31' }) });
  assert.equal(bad.status, 400);
  assert.equal((await api('POST', '/api/batches', { token: alice, body: batch({ quantity: -1 }) })).status, 400);
  assert.equal((await api('POST', '/api/batches', { token: alice, body: batch({ quantity: 1.5 }) })).status, 400);

  const created = await api('POST', '/api/batches', { token: alice, body: batch() });
  assert.equal(created.status, 201);
  assert.equal(created.body.expirationDate, '2030-01-31', 'date round-trips without timezone drift');
  const id = created.body.id;

  assert.equal((await api('POST', '/api/batches', { token: alice, body: batch() })).status, 409);

  const upd = await api('PUT', `/api/batches/${id}`, { token: alice, body: batch({ quantity: 80, price: 32 }) });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.quantity, 80);

  const list = await api('GET', '/api/batches', { token: alice });
  assert.equal(list.body.length, 1);

  assert.equal((await api('DELETE', '/api/batches/not-an-id', { token: alice })).status, 400);
  assert.equal((await api('DELETE', `/api/batches/${id}?reason=bogus`, { token: alice })).status, 400);
});

test("users cannot see, edit or delete each other's batches", async () => {
  const [{ id }] = (await api('GET', '/api/batches', { token: alice })).body;
  assert.deepEqual((await api('GET', '/api/batches', { token: bob })).body, []);
  assert.equal((await api('PUT', `/api/batches/${id}`, { token: bob, body: batch() })).status, 404);
  assert.equal((await api('DELETE', `/api/batches/${id}`, { token: bob })).status, 404);
  assert.equal((await api('GET', '/api/batches', { token: alice })).body.length, 1);
});

test('CSV import is idempotent and reports invalid rows', async () => {
  const rows = [
    batch({ medicationName: 'Pantop 40', batchNumber: 'P1' }),
    batch({ medicationName: 'Pantop 40', batchNumber: 'P1' }), // duplicate inside file
    batch({ medicationName: 'Telma 40', batchNumber: 'T1' }),
    batch({ medicationName: '', batchNumber: 'X' }),            // invalid
    batch({ medicationName: 'Bad date', expirationDate: 'soon' }),
  ];
  const first = await api('POST', '/api/batches/import', { token: alice, body: { rows, filename: 'stock.csv' } });
  assert.equal(first.status, 201);
  assert.equal(first.body.inserted, 2);
  assert.equal(first.body.skippedDuplicateInFile, 1);
  assert.equal(first.body.invalidCount, 2);
  const again = await api('POST', '/api/batches/import', { token: alice, body: { rows, filename: 'stock.csv' } });
  assert.equal(again.body.inserted, 0);
  assert.equal(again.body.skippedExisting, 2);
  assert.equal((await api('POST', '/api/batches/import', { token: alice, body: { rows: [] } })).status, 400);
});

test('audit trail records server-side events with currency-aware details', async () => {
  const [target] = (await api('GET', '/api/batches', { token: alice })).body.filter((b) => b.medicationName === 'Dolo 650');
  await api('PUT', `/api/batches/${target.id}`, { token: alice, body: batch({ quantity: 80, price: 12345.5 }) });
  const del = await api('DELETE', `/api/batches/${target.id}?reason=write-off`, { token: alice });
  assert.equal(del.status, 200);

  const log = (await api('GET', '/api/audit', { token: alice })).body;
  const actions = log.map((l) => l.action);
  for (const a of ['Account Created', 'Authentication Success', 'Authentication Failed', 'Batch Created', 'Batch Updated', 'CSV Import', 'Stock Written Off']) {
    assert.ok(actions.includes(a), `missing audit action: ${a}`);
  }
  const writeOff = log.find((l) => l.action === 'Stock Written Off');
  assert.match(writeOff.details, /₹9,87,640\.00/, 'India region formats the loss as rupees with lakh grouping');
  assert.deepEqual((await api('GET', '/api/audit', { token: bob })).body.map((l) => l.action), ['Account Created']);
});

test('audit entries are immutable', async () => {
  await assert.rejects(AuditLog.updateMany({}, { action: 'tampered' }), /immutable/);
  await assert.rejects(AuditLog.deleteMany({}), /immutable/);
  const doc = await AuditLog.findOne();
  doc.action = 'tampered';
  await assert.rejects(doc.save(), /immutable/);
});

test('changing region updates currency and is audited', async () => {
  assert.equal((await api('PATCH', '/api/auth/me', { token: alice, body: { region: 'XX' } })).status, 400);
  const res = await api('PATCH', '/api/auth/me', { token: alice, body: { region: 'GB' } });
  assert.equal(res.body.user.region, 'GB');
  const me = await api('GET', '/api/auth/me', { token: alice });
  assert.equal(me.body.user.region, 'GB');
  const log = (await api('GET', '/api/audit', { token: alice })).body;
  assert.ok(log.some((l) => l.action === 'Region Changed' && /GBP/.test(l.details)));
});

test('unknown API routes return JSON 404', async () => {
  const res = await api('GET', '/api/nope');
  assert.equal(res.status, 404);
  assert.ok(res.body.error);
});
