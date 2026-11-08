'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleHookEvent } = require('../src/hooks');

function setup() {
  const notifications = [];
  const monitor = {
    observe(payload) {
      if (payload.remainingPercent === undefined) return null;
      return { percent: payload.remainingPercent, alert: payload.remainingPercent <= 5 };
    },
  };
  const notifier = {
    async notify(notification) {
      notifications.push(notification);
    },
  };
  return { notifications, monitor, notifier };
}

test('notifies when a Stop event completes with remaining capacity', async () => {
  const deps = setup();
  const result = await handleHookEvent(
    { hook_event_name: 'Stop', remainingPercent: 82 },
    deps,
  );

  assert.equal(result.handled, true);
  assert.deepEqual(deps.notifications, [{
    title: 'Claude Code',
    message: 'Claude Code finished • Rate Limit remaining: 82%',
    urgent: false,
  }]);
});

test('notifies when Claude Code asks for approval or input', async () => {
  const deps = setup();
  await handleHookEvent(
    { hook_event_name: 'Notification', notification_type: 'permission_prompt' },
    deps,
  );

  assert.deepEqual(deps.notifications, [{
    title: 'Claude Code',
    message: 'Claude Code needs your input',
    urgent: false,
  }]);
});

test('sends an urgent alert immediately for critical capacity', async () => {
  const deps = setup();
  await handleHookEvent(
    { hook_event_name: 'Stop', remainingPercent: 4 },
    deps,
  );

  assert.deepEqual(deps.notifications, [
    {
      title: 'Claude Code',
      message: '⚠️ Attention: only 4% of Rate Limit / credits available!',
      urgent: true,
    },
    {
      title: 'Claude Code',
      message: 'Claude Code finished • Rate Limit remaining: 4%',
      urgent: false,
    },
  ]);
});

test('ignores malformed payloads without throwing', async () => {
  const deps = setup();
  const result = await handleHookEvent('{not json', deps);
  assert.deepEqual(result, { handled: false, percent: null, alert: false });
  assert.equal(deps.notifications.length, 0);
});
