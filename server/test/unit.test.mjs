import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { classifyRequest } from '../src/access.js';
import { canonicalJson, recordHash, verifyChain } from '../src/canonical.js';
import { sayForBooking } from '../src/tools/errors.js';
import { namesMatch, normCode } from '../src/names.js';
import { decideLogin, hashPin, verifyPin } from '../src/pins.js';
import { repoRoot } from '../support/clinic.js';

test('canonical json sorts keys and drops underscore fields', () => {
  assert.equal(canonicalJson({ b: 1, a: 2, _secret: 3 }), '{"a":2,"b":1}');
  assert.equal(canonicalJson({ n: 1.0 }), '{"n":1}');
  assert.equal(canonicalJson({ n: 1.5 }), '{"n":1.5}');
});

test('verifyChain fails a tampered hash', () => {
  const prev = '0'.repeat(64);
  const envelope = {
    schema_version: 1,
    event_id: '00000000-0000-4000-8000-000000000001',
    trace_id: 'call-1',
    call_id: '1',
    clinic_id: 1,
    seq: 0,
    ts: '2026-10-24T12:00:00.000Z',
    event_type: 'call_started',
    severity: 'info',
    payload: { persona_key: 'family' },
  };
  const event = { ...envelope, prev_hash: prev, record_hash: recordHash(envelope, prev) };
  assert.equal(verifyChain([event]).ok, true);
  const broken = { ...event, record_hash: 'ab'.repeat(32) };
  assert.equal(verifyChain([broken]).ok, false);
  assert.equal(verifyChain([broken]).reason, 'record_hash');
});

test('latin names match within two edits', () => {
  assert.equal(namesMatch('Meera Demoo', 'Meera Demo'), true);
  assert.equal(namesMatch('Totally Different', 'Meera Demo'), false);
  assert.equal(namesMatch('Ann', 'Ann'), true);
  assert.equal(namesMatch('Ana', 'Ann'), false);
  assert.equal(normCode('HC/2026/0412'), 'HC20260412');
});

test('PIN hash does not store the PIN', () => {
  const pin = 'zebra-pin';
  const hash = hashPin(pin);
  assert.equal(hash.includes(pin), false);
  assert.equal(verifyPin(pin, hash), true);
  assert.equal(verifyPin('other-pin', hash), false);
});

test('DESK_PIN is receptionist-only until a hash exists', () => {
  const receptionist = { id: 1, name: 'Front desk', role: 'receptionist', doctor_id: null, active: true };
  const doctor = { id: 6, name: 'Dr Demo Kaur', role: 'doctor', doctor_id: 3, active: true, pin_hash: hashPin('4343') };
  assert.equal(decideLogin({ staff: receptionist, pin: '2468', deskPin: '2468', columnExists: false }).role, 'receptionist');
  assert.equal(decideLogin({ staff: doctor, pin: '2468', deskPin: '2468', columnExists: false }), null);
  assert.equal(decideLogin({ staff: { ...doctor, pin_hash: null }, pin: '2468', deskPin: '2468', columnExists: true }), null);
  assert.equal(decideLogin({ staff: doctor, pin: '4343', deskPin: '2468', columnExists: true }).role, 'doctor');
  assert.equal(decideLogin({ staff: doctor, pin: '2468', deskPin: '2468', columnExists: true }), null);
  const hashedDesk = { ...receptionist, pin_hash: hashPin('4242') };
  assert.equal(decideLogin({ staff: hashedDesk, pin: '2468', deskPin: '2468', columnExists: true }), null);
  assert.equal(decideLogin({ staff: hashedDesk, pin: '4242', deskPin: '2468', columnExists: true }).doctor_id, null);
});

test('public tunnel host cannot call the desk', () => {
  const config = { publicBaseUrl: 'https://demo.example', adapters: new Set(['local']), trustPrivatePeers: false };
  const base = { headers: { host: 'demo.example' }, socket: { remoteAddress: '203.0.113.8' } };
  assert.equal(classifyRequest({ ...base, method: 'GET', urlPath: '/healthz' }, config), 'public');
  assert.equal(classifyRequest({ ...base, method: 'POST', urlPath: '/v1/tools/lookup_caller' }, config), 'public');
  assert.equal(classifyRequest({ ...base, method: 'POST', urlPath: '/api/desk/login' }, config), 'deny');
  assert.equal(classifyRequest({
    headers: { host: '127.0.0.1:8000' },
    socket: { remoteAddress: '127.0.0.1' },
    method: 'POST',
    urlPath: '/api/desk/login',
  }, config), 'local');
});

test('booking errors become a spoken sentence', () => {
  assert.equal(sayForBooking('window 18 is full'), 'That arrival window is full.');
  assert.equal(sayForBooking('doctor 3 requires an appointment fee'), 'That visit has a fee. I need a clear yes before I can book it.');
  assert.doesNotMatch(sayForBooking('window 18 is full'), /window 18/);
});

test('migration adds hashes and does not insert pins', () => {
  const root = repoRoot();
  const migration = fs.readFileSync(`${root}/db/003_staff_auth.sql`, 'utf8');
  const seed = fs.readFileSync(`${root}/db/seed.sql`, 'utf8');
  const compose = fs.readFileSync(`${root}/deploy/docker-compose.yml`, 'utf8');
  assert.match(migration, /pin_hash text/);
  assert.match(migration, /pin_updated_at timestamptz/);
  assert.doesNotMatch(migration, /INSERT INTO staff_users/i);
  assert.doesNotMatch(seed, /pin_hash/);
  assert.match(compose, /05_staff_auth\.sql/);
  assert.match(compose, /worker-holds/);
  assert.match(compose, /mcp-identity/);
  assert.doesNotMatch(compose, /compose\.override/);
});
