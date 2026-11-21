// Exercise the shipping TypeScript booking client against an isolated real API.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
import ts from 'typescript';
const config = JSON.parse(fs.readFileSync(0, 'utf8'));
async function request(method, endpoint, body) {
  const response = await fetch(new URL(endpoint, config.origin), {
    method, headers: {Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`API ${response.status}`);
  return {data};
}
const api = {
  apiClient: {get: endpoint => request('GET', endpoint), post: (endpoint, body) => request('POST', endpoint, body)},
  authApi: {me: () => request('GET', '/auth/me')},
  eventsApi: {get: id => request('GET', `/event/${id}`)},
};
const source = fs.readFileSync(path.join(directory, '../src/lib/bookings.ts'), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const moduleObject = {exports: {}};
vm.runInNewContext(compiled, {exports: moduleObject.exports, require: name => {
  if (name === '@eventmind/api') return api;
  throw new Error('Unexpected runtime import');
}});
(async () => {
  const client = moduleObject.exports;
  const booked = config.action === 'load' ? await client.loadBookings() : await client.bookFreeEvent(config.eventId, config.quantity, config.requestId);
  process.stdout.write(JSON.stringify(booked));
})().catch(error => {process.stderr.write(error.message); process.exitCode = 1;});
