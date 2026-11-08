'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseRemainingPercent,
  createCriticalMonitor,
  formatRemainingPercent,
} = require('../src/rate-limit-parser');

test('parses explicit nested remaining percentage fields', () => {
  assert.equal(parseRemainingPercent({ usage: { rate_limit_remaining_percent: 82 } }), 82);
  assert.equal(parseRemainingPercent('{"rateLimit":{"remainingPercent":41}}'), 41);
});

test('parses textual percentage and fractional capacity values', () => {
  assert.equal(parseRemainingPercent('Rate Limit remaining: 4%'), 4);
  assert.equal(parseRemainingPercent({ creditsRemaining: 0.05 }), 5);
});

test('clamps valid percentages and ignores ambiguous values', () => {
  assert.equal(parseRemainingPercent({ rate_limit_remaining_percent: 120 }), 100);
  assert.equal(parseRemainingPercent({ rate_limit_remaining_percent: -2 }), 0);
  assert.equal(parseRemainingPercent({ tokens: 4 }), null);
  assert.equal(parseRemainingPercent('not metrics'), null);
  assert.equal(parseRemainingPercent(null), null);
});

test('emits one critical alert and rearms after recovery', () => {
  const monitor = createCriticalMonitor();
  assert.deepEqual(monitor.observe({ remainingPercent: 5 }), { percent: 5, alert: true });
  assert.deepEqual(monitor.observe({ remainingPercent: 4 }), { percent: 4, alert: false });
  assert.deepEqual(monitor.observe({ remainingPercent: 80 }), { percent: 80, alert: false });
  assert.deepEqual(monitor.observe({ remainingPercent: 5 }), { percent: 5, alert: true });
});

test('formats percentages for notification copy', () => {
  assert.equal(formatRemainingPercent(82), '82%');
  assert.equal(formatRemainingPercent(null), 'unknown');
});
