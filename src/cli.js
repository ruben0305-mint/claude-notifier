#!/usr/bin/env node

'use strict';

function main() {
  process.stdout.write('claude-notifier\n');
}

if (require.main === module) {
  main();
}

module.exports = { main };
