# claude-notifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and document a zero-dependency cross-platform Claude Code notification hook with rate-limit parsing, critical alerts, installation, and tests.

**Architecture:** A CommonJS CLI delegates lifecycle routing to `hooks.js`, metric extraction/state to `rate-limit-parser.js`, native command construction to `notifier.js`, and safe settings merging to `installer.js`. Dependency injection keeps OS processes and filesystem writes testable without external packages.

**Tech Stack:** Node.js 18+, CommonJS JavaScript, `node:test`, native `child_process`, `fs/promises`, `path`, and `os` modules.

**Spec:** `docs/superpowers/specs/2026-11-08-claude-notifier-design.md`

## Global Constraints

- Zero External NPM Dependencies.
- Native notifications use `osascript` on macOS, PowerShell Toast Notification on Windows, and `notify-send` on Linux.
- Critical warning threshold is 5% remaining.
- Notification execution is asynchronous and must not block the main hook process.
- Existing Claude Code settings and hooks must be preserved.
- Required commit messages are exact Conventional Commit messages supplied by the user.

## Review Focus

- Malformed, empty, or unknown hook payloads must return safely without throwing; pin in parser and hook tests.
- Fractional remaining values (`0.05`) versus percentage values (`5`) must normalize correctly; pin in parser tests.
- Repeated critical observations must not spam notifications, while recovery must re-arm the alert; pin in monitor tests.
- Shell-sensitive notification text must not become executable command text; pin in command-builder tests.
- Existing settings with unrelated hooks and non-hook keys must survive installation unchanged; pin in installer tests.

---

### Task 1: Repository foundation

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `src/cli.js`, `bin/claude-notifier.js`
- Create: `test/fixtures/.gitkeep`

**Interfaces:**
- Produces package scripts `start`, `test`, and `build`, plus a `claude-notifier` bin entry.

- [ ] Initialize Git and add the package metadata, MIT license, ignore rules, and executable entry-point placeholders.
- [ ] Run `npm test` and verify the dependency-free test command starts successfully.
- [ ] Commit as `feat(init): initialize project structure, package.json and LICENSE`.

### Task 2: Native notification handler

**Files:**
- Create: `src/notifier.js`
- Create: `test/notifier.test.js`

**Interfaces:**
- Produces `createNotifier(options) -> { notify({ title, message, urgent }) -> Promise<void> }`.
- Produces `buildMacCommand(title, message)`, `buildWindowsCommand(title, message, urgent)`, and `buildLinuxCommand(title, message, urgent)` for deterministic tests.

- [ ] Write tests for macOS, Windows, and Linux command selection plus escaping/argument preservation.
- [ ] Implement async command execution with injectable `platform` and `runner`; reject unsupported platforms with a clear error.
- [ ] Run `node --test test/notifier.test.js` and verify all platform tests pass.
- [ ] Commit as `feat(notifier): add cross-platform OS notification handler (macOS/Win/Linux)`.

### Task 3: Rate-limit parser and threshold monitor

**Files:**
- Create: `src/rate-limit-parser.js`
- Create: `test/rate-limit-parser.test.js`

**Interfaces:**
- Produces `parseRemainingPercent(input) -> number | null`.
- Produces `createCriticalMonitor(threshold = 5) -> { observe(input) -> { percent, alert } | null }`.
- Produces `formatRemainingPercent(percent) -> string`.

- [ ] Write tests for nested JSON fields, textual percentage forms, fractional values, clamping, malformed input, and unknown fields.
- [ ] Write tests proving one alert at `<= 5`, suppression while still critical, and re-arming after recovery.
- [ ] Implement conservative extraction from explicit remaining fields and known text patterns only.
- [ ] Run `node --test test/rate-limit-parser.test.js` and verify all parser tests pass.
- [ ] Commit as `feat(parser): add rate-limit parser and 5% threshold critical warning`.

### Task 4: Hook routing and CLI integration

**Files:**
- Create: `src/hooks.js`
- Modify: `src/cli.js`
- Modify: `bin/claude-notifier.js`
- Create: `test/hooks.test.js`

**Interfaces:**
- Produces `handleHookEvent(payload, dependencies) -> Promise<{ handled, percent, alert }>`.
- Supports `Stop` completion events and `Notification` approval/input events.
- CLI supports `hook` mode reading stdin and `--version`.

- [ ] Write tests for completion messages with a parsed percentage, approval/input messages, critical alerts, and malformed payloads.
- [ ] Implement routing with injected notifier and monitor; ensure notification failures do not corrupt parser state.
- [ ] Wire stdin handling and JSON/text input normalization through the executable.
- [ ] Run `node --test test/hooks.test.js` and verify all hook tests pass.
- [ ] Commit as `feat(hooks): create Claude Code event triggers and hook integration`.

### Task 5: Automated installer

**Files:**
- Create: `src/installer.js`
- Create: `install.js`
- Create: `install.sh`
- Create: `test/installer.test.js`

**Interfaces:**
- Produces `installHooks({ configPath, command, fsModule }) -> Promise<{ configPath, changed }>`.
- Registers idempotent `Stop` and `Notification` command hooks while preserving existing settings.

- [ ] Write tests for creating a missing config, merging existing settings/hooks, and running twice without duplicates.
- [ ] Implement atomic-ish temp-file write/rename flow and configurable paths for test isolation.
- [ ] Implement Node installer entry point and POSIX wrapper.
- [ ] Run `node --test test/installer.test.js` and verify installer tests pass.
- [ ] Commit as `feat(installer): add automated installation script for Claude Code setup`.

### Task 6: Documentation and final verification

**Files:**
- Create: `README.md`
- Create: `CHANGELOG.md`
- Modify: `package.json` if documentation metadata is needed

**Interfaces:**
- Documents installation, supported payloads, platform behavior, security/privacy, troubleshooting, development, tests, and contribution flow.

- [ ] Write README badges, problem statement, feature list, quick start, ASCII flow diagram, configuration examples, limitations, and contribution guide.
- [ ] Run `npm test`, `npm run build`, and smoke-test `node bin/claude-notifier.js --version`.
- [ ] Run `git diff --check` and verify the working tree contains only intended files.
- [ ] Commit as `docs(readme): add comprehensive documentation, usage guide and badges`.
