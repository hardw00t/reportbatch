import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
assert.ok(policy, 'Production HTML must retain its CSP.');
assert.equal(policy.split(';').map(value => value.trim()).find(value => value.startsWith('connect-src ')), "connect-src 'self'", 'Production connections must stay same-origin.');
assert.ok(!/unsafe-eval|ws:\/\/|wss:\/\//.test(policy), 'Development WebSocket/eval policy must not ship.');
assert.ok(html.includes('name="referrer" content="no-referrer"'), 'Production HTML must retain no-referrer.');
console.log('Production CSP/referrer checks passed.');
