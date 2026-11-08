'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { installHooks } = require('../src/installer');

test('creates a Claude settings file with Stop and Notification hooks', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-notifier-'));
  const configPath = path.join(directory, 'settings.json');
  const result = await installHooks({ configPath, command: 'claude-notifier hook' });
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

  assert.equal(result.changed, true);
  assert.equal(config.hooks.Stop[0].hooks[0].command, 'claude-notifier hook');
  assert.equal(config.hooks.Notification[0].hooks[0].command, 'claude-notifier hook');
});

test('preserves existing settings and does not duplicate hooks', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-notifier-'));
  const configPath = path.join(directory, 'settings.json');
  await fs.writeFile(configPath, JSON.stringify({ model: 'test', hooks: { Stop: [{ hooks: [{ command: 'existing' }] }] } }));

  await installHooks({ configPath, command: 'claude-notifier hook' });
  const second = await installHooks({ configPath, command: 'claude-notifier hook' });
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

  assert.equal(config.model, 'test');
  assert.equal(config.hooks.Stop.length, 2);
  assert.equal(config.hooks.Stop.filter((entry) => entry.hooks[0].command === 'claude-notifier hook').length, 1);
  assert.equal(config.hooks.Notification.length, 1);
  assert.equal(second.changed, false);
});
