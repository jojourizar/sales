# Deal Motion Router

![Deal Motion Router: two deals from the same pipeline, one worked at the wrong size](docs/loop.gif)

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg) ![Node](https://img.shields.io/badge/node-%3E%3D18-blue) ![Pipedrive](https://img.shields.io/badge/Pipedrive-read--only-orange) ![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)

A Claude Code skill that reads your Pipedrive (read-only) and tells your sales team, for every account: whether to work it as Enterprise, Mid-Market or SMB, whether the buying committee is mapped, how your touches compare to what a deal that size needs, and how ready the account is to close.

It corrects the most common sales error in both directions: running an enterprise motion on a small deal, and running a light motion on a committee sale.

Built by [Josué Urizar](https://monkeyweaver.com), fractional CMO for B2B SaaS founders, from the method he ran when the pipeline was his problem.

## Why it is different from asking Claude directly
The Pipedrive MCP gives Claude access to your data. This skill gives Claude a consistent, calibrated method over that data: the same deal always gets the same verdict, grounded in a proven sales framework, with a report a CEO and an account executive read the same way every time.

## Install
1. Clone the repo straight into your Claude Code skills folder, as a folder named `deal-motion-router`:
   - macOS/Linux:
     ```
     git clone https://github.com/jojourizar/sales.git ~/.claude/skills/deal-motion-router
     ```
   - Windows:
     ```
     git clone https://github.com/jojourizar/sales.git %USERPROFILE%\.claude\skills\deal-motion-router
     ```
   The result should be `.../.claude/skills/deal-motion-router/SKILL.md`. (The repo is named `sales`; the target folder above gives the skill its own clean name. Any folder name works, since the skill registers by its `SKILL.md` name.)
2. Restart Claude Code.
3. Run setup, once: say `run setup for deal motion router`. It reads your Pipedrive fields and configures itself to your instance in one conversation.
4. Then: `audit the deals that passed discovery this month`.

## Requirements
- Claude Code.
- The Pipedrive MCP connected (read-only is enough). Works with `@ckalima/pipedrive-mcp-server`.
- Node.js 18 or higher (the same one your MCP uses).

No dependencies to install. The skill never writes to your CRM.

## How it decides
The spine is the deal value, converted to EUR. Two cutoffs split the pipeline into SMB, Mid-Market and Enterprise. You do not invent them: setup pulls a sample of your own deal values and proposes the cutoffs at the 50th and 80th percentiles of your pipeline (`lib/thresholds.js`), which you accept or adjust. A segment you mark as a committee sale (public sector, banking) forces the Enterprise motion whatever the value.

The committee map and the readiness score use the fields you mapped during setup. A concept you did not map (say, no "economic buyer" field in your Pipedrive) is reported as not available, never counted as a gap and never guessed.

## What it produces
A per-account report: the motion verdict, a buying-committee map with the gaps marked, your touches vs the benchmark for that size, a readiness score from 0 to 100, and what to fill to raise your probability of closing. Anything the analyzer cannot determine, it says, instead of guessing.

## Example
Two real deals audited by the engine, same day, same pipeline. This is the error the tool exists to catch, in both directions.

![The two verdicts, rendered from the engine's own output on the test fixtures](docs/verdicts.png)

**A 4M€ government deal, proposal sent, no committee mapped:**
```
🔴 State of Verona — Regional Rollout: you are working a large account
like a small one.

Enterprise · €4,000,000 · Proposal sent · ready to close: 27/100 (D)

Missing to win it (by impact):
  🔴 Economic buyer      — no one identified who can approve the budget
  🔴 Decision process    — you don't know how or when this gets approved
     Pain identified     — not on record
     Account intel       — not on record
     Contact person      — no one linked to this deal

Touches vs. what a deal like this needs: single-threaded, below the
8-12 per quarter / 3+ people benchmark for Enterprise.
```

**An 18K€ single-contact deal, same pipeline:**
```
✅ Bright Fields Ltd: SMB, on track.

SMB · €18,000 · Discovery done · ready to close: 100/100 (A)

Nothing missing. This account isn't held to a committee standard
because it doesn't need one — that's the point.
```
Same engine, same day. One account is bleeding a 4M€ deal on missing
paperwork; the other is exactly as lean as it should be. Treating both
the same way would be wrong in both directions.

## Tests
From the skill folder: `node --test`. No Pipedrive needed.

## License
MIT. Built by [Josué Urizar](https://monkeyweaver.com).
