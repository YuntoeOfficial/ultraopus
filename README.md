# UltraOpus

A Claude Code plugin that splits engineering work between two models: one orchestrates, one executes, and neither gets to lie about the result.

By [YuntoeOfficial](https://github.com/YuntoeOfficial).

## What it does

The main thread plans, reads the real code, writes a work packet, and dispatches. The executor agent implements inside a strict scope and must return raw command output. A verifier agent reviews multi-file changes with read-only tools.

```
user
 └─ orchestrator (Fable 5.5) — reads, plans, gates evidence, never edits
      ├─ ultraopus:executor (Opus 5.5) — implements + verifies
      └─ ultraopus:verifier (Fable 5.5) — adversarial review
```

The rules that make it work:

- The orchestrator cannot use Write or Edit. If it catches itself about to edit, it turns that into a packet.
- SCOPE in a packet is a whitelist. Unlisted files are out of bounds.
- A return without command output is rejected, so "tests pass" cannot mean "I believe tests would pass".
- Three dispatch cycles maximum, then the failure surfaces with evidence.

## Install

```powershell
claude plugin marketplace add YuntoeOfficial/ultraopus
claude plugin install ultraopus@ultraopus
```

Restart the session. Then:

```
/orchestrate add rate limiting to the upload endpoint
```

or just describe multi-file work and the skill loads itself.

## Requirements

- Claude Code 2.1.309 or later
- Model aliases `opus` and `fable` on your provider. `model: opus` resolves through `ANTHROPIC_DEFAULT_OPUS_MODEL`, `model: fable` through `ANTHROPIC_DEFAULT_FABLE_MODEL`. If your provider has no Fable, edit the verifier's `model:` line.

## Optional: subagent status line

Renders each agent row as state, agent, model, context percentage, effort, and the packet description:

```
run | executor | Opus 5.5 | 12.4k 6% | effort high | Implement rate limiting in src/api/upload.ts with ...
```

```powershell
powershell -NoProfile -File <plugin-root>\scripts\install-statusline.ps1
```

Writes `subagentStatusLine` into `~/.claude/settings.json` after backing it up. `-Uninstall` removes it.

## License

MIT. See [LICENSE](LICENSE).
