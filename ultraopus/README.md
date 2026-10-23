# UltraOpus

Fable 5.5 orchestrates. Opus 5.5 implements and verifies.

A two-role split for Claude Code. The main thread reads, plans, writes a work packet, dispatches, and gates the result on evidence. The executor agent writes code and runs commands inside a strict scope. A verifier agent reviews multi-file changes with read-only tools on the lightest model in the chain.

## Components

| Component | Type | Model | Purpose |
|---|---|---|---|
| `orchestrate` | skill | main thread | Protocol: lane selection, packet contract, dispatch, verification gate |
| `ultraopus:executor` | agent | `opus` | Implementation, command execution, self-verification |
| `ultraopus:verifier` | agent | `fable` | Adversarial review of a completed change |
| `subagent-status.js` | optional | none | Per-row agent panel status: agent, model, state, tokens, packet |

## Requirements

Claude Code 2.1.309 or later. Model aliases `opus` and `fable` must resolve on your provider; `model: opus` uses `ANTHROPIC_DEFAULT_OPUS_MODEL` and `model: fable` uses `ANTHROPIC_DEFAULT_FABLE_MODEL`. If your provider has no Fable, change the verifier's `model:` line to something you have.

## Use

```
/orchestrate add rate limiting to the upload endpoint
```

Or just describe the work; the skill loads when the task matches its description. Verify which model a subagent actually runs on with `/tasks` while it is active.

## Why

- The orchestrator never touches a file, so its context stays strategic instead of filling with diffs.
- The executor cannot widen scope, so adjacent cleanup does not ride along unrequested.
- A return without command output is rejected, so "tests pass" cannot mean "I believe tests would pass".
- Three cycles, then the failure surfaces with evidence instead of looping.

## Install from a marketplace

```powershell
claude plugin marketplace add <owner>/<repo>
claude plugin install ultraopus@ultraopus
```

Or from a folder you already have:

```powershell
claude plugin marketplace add C:\path\to\ultraopus-marketplace
claude plugin install ultraopus@ultraopus
```

Restart the session, then run `/reload-plugins` after later edits to the plugin files.

## Install without a marketplace

Copy the `ultraopus` folder (the one containing `.claude-plugin`) to `~/.claude/skills/ultraopus/`. It loads next session as `ultraopus@skills-dir`.

## Optional: subagent status line

The renderer ships in `scripts/` but is not wired by default, because plugin `settings.json` cannot reference the plugin root portably. Install it once per machine:

```powershell
powershell -NoProfile -File <plugin-root>\scripts\install-statusline.ps1
```

That writes `subagentStatusLine` into `~/.claude/settings.json` with an absolute path to the renderer, after backing the file up to `settings.json.bak-ultraopus`. Remove it with `-Uninstall`.

Once wired, each subagent row becomes:

```
run | executor | Opus 5.5 | 12.4k 6% | effort high | Implement rate limiting in src/api/upload.ts with ...
```

Color-coded state (`run` yellow, `done` green, `fail`/`kill` red), resolved model, context percentage, configured effort, and the task description truncated to the available width. ASCII-only output so it survives either the Git Bash or PowerShell status line shell on Windows.

## Uninstall

```powershell
claude plugin uninstall ultraopus
claude plugin marketplace remove ultraopus
```
