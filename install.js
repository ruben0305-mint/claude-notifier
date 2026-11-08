'use strict';

const { installHooks } = require('./src/installer');

installHooks()
  .then(({ configPath, changed }) => {
    process.stdout.write(`${changed ? 'Installed' : 'Already installed'} Claude Code hooks in ${configPath}\n`);
  })
  .catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  });
