'use strict';

const { createCriticalMonitor, formatRemainingPercent, parseRemainingPercent } = require('./rate-limit-parser');
const { createNotifier } = require('./notifier');

function parsePayload(payload) {
  if (Buffer.isBuffer(payload)) payload = payload.toString('utf8');
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return payload && typeof payload === 'object' ? payload : null;
}

function isInputRequest(payload) {
  const type = String(payload.notification_type || payload.type || payload.status || '').toLowerCase();
  return payload.hook_event_name === 'Notification' && (
    /permission|approval|input|question|prompt/.test(type) || payload.message
  );
}

async function handleHookEvent(payload, dependencies = {}) {
  const parsed = parsePayload(payload);
  if (!parsed) return { handled: false, percent: null, alert: false };

  const notifier = dependencies.notifier || createNotifier();
  const monitor = dependencies.monitor || createCriticalMonitor();
  const observed = monitor.observe(parsed);
  const percent = observed ? observed.percent : parseRemainingPercent(parsed);
  let alert = false;

  if (observed && observed.alert) {
    alert = true;
    await notifier.notify({
      title: 'Claude Code',
      message: `⚠️ Attention: only ${formatRemainingPercent(percent)} of Rate Limit / credits available!`,
      urgent: true,
    });
  }

  if (parsed.hook_event_name === 'Stop') {
    await notifier.notify({
      title: 'Claude Code',
      message: `Claude Code finished • Rate Limit remaining: ${formatRemainingPercent(percent)}`,
      urgent: false,
    });
    return { handled: true, percent, alert };
  }

  if (isInputRequest(parsed)) {
    await notifier.notify({
      title: 'Claude Code',
      message: 'Claude Code needs your input',
      urgent: false,
    });
    return { handled: true, percent, alert };
  }

  return { handled: Boolean(observed), percent, alert };
}

module.exports = { handleHookEvent, parsePayload, isInputRequest };
