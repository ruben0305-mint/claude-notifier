# claude-notifier Design

## Intent
`claude-notifier` is a zero-dependency Node.js hook/plugin that turns Claude Code lifecycle events into native OS notifications on macOS, Windows, and Linux. It is for developers who want to notice completed responses, approval/input prompts, and low remaining rate-limit or credit capacity without watching the terminal.

## Goals
- Provide asynchronous native notifications using only `osascript`, PowerShell Toast APIs, and `notify-send`.
- Parse supported Claude Code hook payloads and common JSON/text metric shapes without crashing on unknown input.
- Notify once when remaining capacity crosses into the critical `<= 5%` range, then re-arm after recovery.
- Install hooks by merging into `~/.claude/settings.json` without overwriting unrelated user configuration.
- Ship a professional README and automated tests using Node.js built-ins only.

## Non-goals
- Calling Claude or Anthropic APIs.
- Claiming to observe metrics that are absent from a hook payload.
- Replacing the user's existing Claude Code hook commands.
- Maintaining a resident background daemon.

## Anti-goals
- Runtime npm dependencies, shell pipelines, or platform-specific native packages.
- Blocking the Claude Code process while a notification is displayed.
- Treating arbitrary numeric fields as percentages without a known metric name or range.

## Constraints
- CommonJS JavaScript targeting Node.js 18+.
- Zero external npm dependencies.
- Native command execution is asynchronous and uses argument arrays rather than shell interpolation where possible.
- Critical threshold is exactly 5%; alerts are emitted on the first observation at or below the threshold and not repeatedly while capacity remains critical.
- Unknown or malformed payloads produce no notification and no uncaught exception.

## Approaches considered
1. **Resident daemon:** would observe all output continuously, but adds lifecycle, installation, and permission complexity; rejected because the hook contract is enough for lifecycle notifications and a daemon violates the lightweight goal.
2. **Single monolithic CLI:** simplest initial file, but difficult to test platform commands, parser behavior, and installer merging independently; rejected for maintainability.
3. **Small composable modules (chosen):** `notifier.js` owns OS commands, `rate-limit-parser.js` owns metric extraction/state, `hooks.js` owns event routing, and `installer.js` owns settings merging. This keeps platform and payload assumptions isolated while preserving a tiny CLI surface.

## Behavior
- Stop/completion events produce `Claude Code finished` with a remaining percentage when one is present.
- Notification events classified as approval/input required produce `Claude Code needs your input`.
- Any event containing a newly critical remaining percentage produces an urgent warning immediately.
- The parser accepts objects, JSON strings, buffers, and plain text. It recognizes explicit remaining-percentage names and textual percentage phrases; it returns `null` when confidence is insufficient.
- The installer registers idempotent `Stop` and `Notification` command hooks and leaves existing hook entries intact.

## Open implementation calls
- Use `node:test` and `node:assert/strict` to keep tests dependency-free.
- Use dependency injection for command runners and filesystem access so tests never invoke OS notifications or modify the real home directory.
- Use a Node-based installer on every platform; provide a POSIX `install.sh` wrapper that delegates to it when shell execution is convenient.
