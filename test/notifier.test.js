'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildMacCommand,
  buildWindowsCommand,
  buildLinuxCommand,
  createNotifier,
} = require('../src/notifier');

test('builds an AppleScript notification command with escaped content', () => {
  const command = buildMacCommand('Claude', 'It\'s done');
  assert.equal(command.file, 'osascript');
  assert.deepEqual(command.args, ['-e', 'display notification "It\'s done" with title "Claude"']);
});

test('builds a PowerShell toast command without shell interpolation', () => {
  const command = buildWindowsCommand('Claude', 'Need input', true);
  assert.equal(command.file, 'powershell.exe');
  assert.deepEqual(command.args.slice(0, 3), ['-NoProfile', '-NonInteractive', '-Command']);
  assert.match(command.args[3], /Need input/);
  assert.match(command.args[3], /ToastNotification/);
});

test('builds a notify-send command with urgency', () => {
  const command = buildLinuxCommand('Claude', 'Finished', false);
  assert.equal(command.file, 'notify-send');
  assert.deepEqual(command.args, ['--urgency=normal', 'Claude', 'Finished']);
});

test('notifies asynchronously through the injected runner', async () => {
  const calls = [];
  const notifier = createNotifier({
    platform: 'linux',
    runner: async (file, args) => calls.push({ file, args }),
  });

  await notifier.notify({ title: 'Claude', message: 'Finished', urgent: true });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    file: 'notify-send',
    args: ['--urgency=critical', 'Claude', 'Finished'],
  });
});
