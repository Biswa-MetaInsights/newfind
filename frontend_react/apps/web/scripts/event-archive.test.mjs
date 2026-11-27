import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/organizer-rows.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const exports = {};
vm.runInNewContext(outputText, { exports, require: () => ({}) });
const { bucketOf, bucketCounts, CONSOLE_TABS } = exports;
const now = Date.parse('2026-11-27T12:00:00Z');
const event = { start_date: '2026-11-28T12:00:00Z', end_date: '2026-11-28T14:00:00Z' };

test('cancellation archives future and past events and preserves the other buckets', () => {
  assert.equal(bucketOf({ ...event, status: 'cancelled' }, now), 'archived');
  assert.equal(bucketOf({ ...event, status: 'CANCELLED' }, Date.parse('2026-11-30')), 'archived');
  assert.equal(bucketOf({ ...event, status: 'published' }, now), 'live');
  assert.equal(bucketOf({ ...event, status: 'draft' }, now), 'drafts');
});

test('Archived is a separate console tab and All excludes archived rows', () => {
  const counts = bucketCounts([{ bucket: 'archived' }, { bucket: 'drafts' }, { bucket: 'live' }]);
  assert.equal(counts.archived, 1);
  assert.equal(counts.all, 2);
  assert.ok(CONSOLE_TABS.some(tab => tab.key === 'archived' && tab.label === 'Archived'));
});
