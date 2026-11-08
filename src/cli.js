#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const { handleHookEvent } = require('./hooks');

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--version') || argv.includes('-v')) {
    process.stdout.write(`${require('../package.json').version}\n`);
    return;
  }
  if (argv[0] !== 'hook') {
    process.stderr.write('Usage: claude-notifier hook\n');
    process.exitCode = 1;
    return;
  }
  const payload = await readStdin();
  await handleHookEvent(payload);
}

if (require.main === module) {
  main().catch((error) => {
    fs.writeSync(process.stderr.fd, `${error.stack || error}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main, readStdin };
