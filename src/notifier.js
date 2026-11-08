'use strict';

const { execFile } = require('node:child_process');
const process = require('node:process');

function escapeAppleScript(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapePowerShell(value) {
  return String(value).replace(/'/g, "''");
}

function buildMacCommand(title, message) {
  return {
    file: 'osascript',
    args: ['-e', `display notification "${escapeAppleScript(message)}" with title "${escapeAppleScript(title)}"`],
  };
}

function buildWindowsCommand(title, message, urgent) {
  const safeTitle = escapePowerShell(title);
  const safeMessage = escapePowerShell(message);
  const tag = urgent ? 'claude-notifier-critical' : 'claude-notifier';
  const script = [
    '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null',
    `$xml = [Windows.Data.Xml.Dom.XmlDocument]::new()`,
    `$xml.LoadXml('<toast><visual><binding template="ToastText02"><text id="1">${safeTitle}</text><text id="2">${safeMessage}</text></binding></visual><actions/></toast>')`,
    `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('${tag}').Show([Windows.UI.Notifications.ToastNotification]::new($xml))`,
  ].join('; ');
  return { file: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-Command', script] };
}

function buildLinuxCommand(title, message, urgent) {
  return {
    file: 'notify-send',
    args: [`--urgency=${urgent ? 'critical' : 'normal'}`, String(title), String(message)],
  };
}

function commandForPlatform(platform, title, message, urgent) {
  if (platform === 'darwin') return buildMacCommand(title, message);
  if (platform === 'win32') return buildWindowsCommand(title, message, urgent);
  if (platform === 'linux') return buildLinuxCommand(title, message, urgent);
  throw new Error(`Unsupported platform: ${platform}`);
}

function defaultRunner(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function createNotifier({ platform = process.platform, runner = defaultRunner } = {}) {
  return {
    async notify({ title = 'Claude Code', message, urgent = false }) {
      if (typeof message !== 'string' || message.length === 0) {
        throw new TypeError('Notification message must be a non-empty string');
      }
      const command = commandForPlatform(platform, title, message, urgent);
      await runner(command.file, command.args);
    },
  };
}

module.exports = {
  buildMacCommand,
  buildWindowsCommand,
  buildLinuxCommand,
  createNotifier,
};
