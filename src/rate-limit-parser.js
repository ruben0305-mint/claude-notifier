'use strict';

const REMAINING_KEY = /(remaining|available|left)/i;
const PERCENT_KEY = /(percent|percentage|ratio|fraction)/i;
const CAPACITY_KEY = /(rate.?limit|credit|token)/i;

function parseInput(input) {
  if (Buffer.isBuffer(input)) input = input.toString('utf8');
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return input;
}

function normalizeNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const percent = value >= 0 && value <= 1 ? value * 100 : value;
  if (percent < 0 || percent > 100) return Math.max(0, Math.min(100, percent));
  return Math.round(percent * 100) / 100;
}

function findExplicitValue(value, keyPath = []) {
  if (value === null || typeof value !== 'object') return null;
  for (const [key, child] of Object.entries(value)) {
    const lowerKey = key.toLowerCase();
    if (typeof child === 'number' && REMAINING_KEY.test(lowerKey) && (PERCENT_KEY.test(lowerKey) || CAPACITY_KEY.test(lowerKey))) {
      return normalizeNumber(child);
    }
    if (typeof child === 'number' && REMAINING_KEY.test(lowerKey) && keyPath.some((part) => CAPACITY_KEY.test(part))) {
      return normalizeNumber(child);
    }
    const nested = findExplicitValue(child, [...keyPath, lowerKey]);
    if (nested !== null) return nested;
  }
  return null;
}

function parseText(text) {
  const patterns = [
    /(?:rate\s*limit|credits?|tokens?).{0,30}?(?:remaining|available|left)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%/i,
    /(?:remaining|available|left).{0,30}?(?:rate\s*limit|credits?|tokens?)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return normalizeNumber(Number(match[1]));
  }
  return null;
}

function parseRemainingPercent(input) {
  const parsed = parseInput(input);
  if (typeof parsed === 'string') return parseText(parsed);
  return findExplicitValue(parsed);
}

function createCriticalMonitor(threshold = 5) {
  let alerted = false;
  return {
    observe(input) {
      const percent = parseRemainingPercent(input);
      if (percent === null) return null;
      const alert = percent <= threshold && !alerted;
      if (percent <= threshold) alerted = true;
      else alerted = false;
      return { percent, alert };
    },
  };
}

function formatRemainingPercent(percent) {
  return percent === null || percent === undefined ? 'unknown' : `${percent}%`;
}

module.exports = {
  parseRemainingPercent,
  createCriticalMonitor,
  formatRemainingPercent,
};
