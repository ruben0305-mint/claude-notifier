# claude-notifier

[![CI](https://img.shields.io/github/actions/workflow/status/your-org/claude-notifier/ci.yml?label=CI)](https://github.com/your-org/claude-notifier/actions)
[![npm](https://img.shields.io/npm/v/claude-notifier)](https://www.npmjs.com/package/claude-notifier)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

Native desktop notifications for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), implemented as a small, zero-runtime-dependency Node.js hook.

## Why?

Claude Code can spend minutes working while your terminal is in another window. `claude-notifier` lets you keep working and receive a native notification when Claude finishes, needs approval/input, or approaches a capacity limit.

```text
┌───────────────┐   JSON/stdin   ┌─────────────────┐   native command   ┌─────────────┐
│ Claude Code   │ ──────────────▶ │ claude-notifier │ ─────────────────▶ │ OS desktop  │
│ Stop/Notify   │                 │ parse + route   │                    │ notification│
└───────────────┘                 └─────────────────┘                    └─────────────┘
                                        │
                                        └── critical alert once at ≤ 5%
```

## Features

- **Completion notifications** — receive `Claude Code finished` when a `Stop` hook fires.
- **Approval/input notifications** — receive `Claude Code needs your input` for permission prompts and questions.
- **Rate-limit context** — include the parsed remaining percentage in the final notification.
- **Critical threshold** — send an urgent alert immediately when remaining capacity reaches `5%` or less, with duplicate-alert suppression until recovery.
- **Native OS integrations** — `osascript` (macOS), PowerShell Toast Notifications (Windows), and `notify-send` (Linux).
- **Safe installer** — merge hooks into `~/.claude/settings.json` without replacing unrelated settings or existing hooks.
- **No external runtime dependencies** — only Node.js built-ins are used.

## Requirements

- Node.js 18 or newer.
- Claude Code with command hooks enabled.
- Linux: `notify-send` from `libnotify`.
- Windows: PowerShell with Windows Runtime toast APIs (Windows 10/11).
- macOS: `osascript` (included with macOS).

## Quick start

From a clone of this repository:

```bash
npm install
node install.js
```

The installer is idempotent. It adds these commands to your Claude Code settings:

```json
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "claude-notifier hook" }] }],
    "Notification": [{ "hooks": [{ "type": "command", "command": "claude-notifier hook" }] }]
  }
}
```

On macOS/Linux, the shell wrapper is also available:

```bash
./install.sh
```

If the package is installed globally, use the executable directly:

```bash
claude-notifier hook
```

## Supported payloads

Claude Code sends hook data on stdin. The parser accepts JSON objects, JSON strings, buffers, and selected text forms. It intentionally only interprets explicit remaining-capacity fields; arbitrary fields such as `tokens: 4` are ignored.

Examples that are recognized:

```json
{ "rate_limit_remaining_percent": 82 }
```

```json
{ "usage": { "rateLimit": { "remainingPercent": 41 } } }
```

```json
{ "creditsRemaining": 0.05 }
```

```text
Rate Limit remaining: 4%
```

Values between `0` and `1` are treated as fractions (`0.05` → `5%`); values between `0` and `100` are treated as percentages. Values are clamped to `0–100`. Unknown or malformed payloads are ignored safely.

> **Important:** Claude Code hook payloads do not universally expose a live rate-limit stream. The percentage is shown only when the incoming hook payload contains a supported metric. `claude-notifier` never calls an Anthropic API and never invents a percentage.

## Notification behavior

| Event | Notification |
| --- | --- |
| `Stop` with `82%` remaining | `Claude Code finished • Rate Limit remaining: 82%` |
| Permission/input notification | `Claude Code needs your input` |
| Any event crossing into `≤ 5%` | `⚠️ Attention: only 4% of Rate Limit / credits available!` |

Critical alerts are emitted once while capacity is critical. After a later observation above `5%`, the alert is re-armed for the next critical crossing.

## Development

```bash
npm test
npm run build
node bin/claude-notifier.js --version
```

The test suite uses Node's built-in `node:test` runner and injects process/filesystem boundaries, so tests do not send real notifications or modify your Claude settings.

Project modules:

- [`src/notifier.js`](src/notifier.js) — platform detection, command construction, and async execution.
- [`src/rate-limit-parser.js`](src/rate-limit-parser.js) — conservative metric parsing and threshold state.
- [`src/hooks.js`](src/hooks.js) — Claude Code event classification and notification copy.
- [`src/installer.js`](src/installer.js) — idempotent settings merge and atomic temp-file replacement.

## Security and privacy

- No network requests are made.
- Payloads are read from stdin and are not persisted by this project.
- Notification text is passed as process arguments; it is not evaluated as a shell command.
- The installer writes only the selected Claude settings file and preserves existing JSON keys.
- Review hook payloads before enabling third-party hooks in a shared or managed environment.

## Troubleshooting

### No Linux notification appears

Install `notify-send` and verify it independently:

```bash
notify-send "Claude Code" "Test notification"
```

### Windows toast does not appear

Run PowerShell with the same user account and verify that Windows notifications are enabled for PowerShell. The command uses `-NoProfile` and does not require a PowerShell profile.

### The final message says `unknown`

The hook payload did not include a recognized remaining-capacity field. Add or preserve one of the documented fields in the integration that supplies the payload; this project does not infer a rate limit from unrelated token counts.

### Existing hooks were not replaced

That is intentional. The installer appends only the `claude-notifier hook` command when it is not already present.

## Contributing

1. Fork the repository and create a focused branch.
2. Keep the zero-dependency runtime constraint.
3. Add a failing `node:test` test before changing behavior.
4. Run `npm test`, `npm run build`, and `git diff --check`.
5. Open a pull request describing the payload shape and platforms tested.

Bug reports should include Node.js version, OS, Claude Code hook event name, and a redacted example payload. Never include API keys, private prompts, or sensitive project content.

## License

MIT © 2026 claude-notifier contributors. See [LICENSE](LICENSE).
