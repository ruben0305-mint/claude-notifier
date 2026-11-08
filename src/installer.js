'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

function hookEntry(command) {
  return { hooks: [{ type: 'command', command }] };
}

function hasCommand(entries, command) {
  return Array.isArray(entries) && entries.some((entry) =>
    Array.isArray(entry.hooks) && entry.hooks.some((hook) => hook && hook.command === command),
  );
}

async function installHooks({
  configPath = path.join(os.homedir(), '.claude', 'settings.json'),
  command = 'claude-notifier hook',
  fsModule = fs,
} = {}) {
  let config = {};
  try {
    config = JSON.parse(await fsModule.readFile(configPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Unable to read Claude settings: ${error.message}`);
  }

  const hooks = config.hooks && typeof config.hooks === 'object' ? { ...config.hooks } : {};
  let changed = false;
  for (const event of ['Stop', 'Notification']) {
    const entries = Array.isArray(hooks[event]) ? [...hooks[event]] : [];
    if (!hasCommand(entries, command)) {
      entries.push(hookEntry(command));
      hooks[event] = entries;
      changed = true;
    }
  }

  if (!changed) return { configPath, changed: false };
  const nextConfig = { ...config, hooks };
  await fsModule.mkdir(path.dirname(configPath), { recursive: true });
  const tempPath = `${configPath}.${process.pid}.tmp`;
  await fsModule.writeFile(tempPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
  await fsModule.rename(tempPath, configPath);
  return { configPath, changed: true };
}

module.exports = { installHooks };
