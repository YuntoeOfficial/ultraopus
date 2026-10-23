---
name: orchestrate
description: Split work between a strategic orchestrator and an execution subagent. The main thread plans, writes work packets, dispatches to ultraopus:executor, and verifies claims; the executor implements with full tools on Opus. Use for multi-file implementation, build or test loops, refactors, or when the user asks to orchestrate, delegate, or split the work.
---

# UltraOpus

Two roles, one hard boundary: the main thread decides and verifies. The executor writes and runs.

This exists for a reason. A model that plans and codes in the same breath drifts: it skips reading, invents file contents, and reports success from intent instead of evidence. Separating decision from execution keeps the strategic context clean and forces implementation to prove itself.

## Runbook

1. Read the code the task touches. Do not plan from memory.
2. Pick the lane. A question, a read-only analysis, or a trivial single-file change gets handled directly; stop here.
3. Write the packet: TASK, CONTEXT (with file:line), SCOPE, DO NOT, ACCEPTANCE, VERIFY, RETURN.
4. Dispatch `ultraopus:executor`. Independent packets go out in parallel, in one message.
5. Gate the return: changed files inside SCOPE, evidence per acceptance item, raw verify output, no unrequested changes. On a miss, re-dispatch with a `FAILURE:` line. Three cycles maximum.
6. If the change spans more than two files or touches a build path, dispatch `ultraopus:verifier` on the completed work.
7. Report status and deltas to the user. No plan narration.

If the plugin is disabled and a user-level `executor` or `verifier` exists, use those unscoped names instead.

## Role contract

Main thread (orchestrator):

- Owns interpretation, scope, work packets, acceptance criteria, independent verification, and the report to the user.
- Never uses Write, Edit, NotebookEdit, or any direct file mutation.
- May use Read, Grep, Glob, and Bash for inspection and for re-running verification itself.
- If it catches itself about to edit a file, it converts that edit into a packet instead.

Executor subagent (`ultraopus:executor`):

- Owns implementation, command execution, and self-verification.
- Never expands scope, never edits outside the fence, never reports success without raw command output.

Second pass (`ultraopus:verifier`):

- Adversarial review with read-only tools plus build and test execution.
- Used when a change spans more than two files, touches a build path, or touches an invariant shared across modules.

## Lane selection

Answer directly when the request is a question, an explanation, read-only analysis, a single-value lookup, or a change under roughly ten lines in one file with no build step.

Delegate when any of these are true:

- A write spans more than one file.
- A build, test, or runtime loop is required.
- Shared invariants, public interfaces, or data formats move.
- The user explicitly asks for execution or orchestration.

Do not perform the executor's job to save a round trip. The round trip is the point.

## Work packet

Every dispatch carries a packet in this exact shape:

```
TASK: <one sentence, imperative, singular>
CONTEXT: <facts established by reading, each with file:line>
SCOPE: <exact paths allowed to change>
DO NOT: <paths, behaviors, or refactors that are out of bounds>
ACCEPTANCE: <observable checks, no adjectives>
VERIFY: <exact commands to run, in order>
RETURN: status, files changed, verify output, deltas, blockers
```

Rules for filling it:

- Every claim in CONTEXT must come from a file actually read in this session. No assumptions, no recollection.
- ACCEPTANCE items must be checkable by a command, an assertion, or a specific line of code. If you cannot write one, you do not understand the task yet.
- SCOPE is a whitelist, not a suggestion. Unlisted files are out of bounds even when the fix appears to live there; widen the packet instead of letting the executor improvise.
- DO NOT is where you prevent collateral damage: renames, formatting sweeps, dependency upgrades, deletions, comment cleanups.

## Dispatch

- One packet equals one unit equals one dominant risk. Split until that is true.
- Independent packets go out in parallel, in a single message with multiple dispatches.
- Pass the packet verbatim. Do not paraphrase it into prose; the packet is the contract.
- Executor runs on `model: opus`, which resolves to Opus 5.5 through `ANTHROPIC_DEFAULT_OPUS_MODEL`. Keep the main thread on Fable.

## Verification gate

When a packet returns, check all four before accepting:

1. Changed files are a subset of SCOPE.
2. Every ACCEPTANCE item has evidence attached: command output, test name, or file:line.
3. VERIFY commands were genuinely executed. Output must be present. If it is missing, run the commands yourself.
4. No unrequested refactors, renames, deletions, or dependency changes.

Any miss is a rejection. Re-dispatch the same packet with a `FAILURE:` line appended containing the exact signature. Three cycles is the ceiling. On the third failure, stop and report blocked with what was attempted and what evidence contradicts the claim.

## Report to the user

Status and deltas only:

- What changed and where.
- What proved it.
- What remains.
- What is blocked, in one line, with the reason.

No plan narration, no restating the request, no victory lap.

## Failure modes to police

- Hallucinated context. The executor builds against a file that does not look like the packet claims. Cause: orchestrator skipped reading. Fix: read before re-dispatching.
- Scope creep. Executor fixes three adjacent things. Cause: vague SCOPE or no DO NOT. Fix: reject and tighten the fence.
- Verification theater. "Tests pass" with no output. Fix: demand raw output, then run it yourself.
- Looping. Same failure signature twice. Fix: change the packet, not the retry count.
- Delegation for its own sake. A one-line fix routed through three agents. Fix: use the direct lane.
