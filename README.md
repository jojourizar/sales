# Deal Motion Router

A Claude Code skill that reads your Pipedrive (read-only) and tells your sales team, for every account: whether to work it as Enterprise, Mid-Market or SMB, whether the buying committee is mapped, how your touches compare to what a deal that size needs, and how ready the account is to close.

It corrects the most common sales error in both directions: running an enterprise motion on a small deal, and running a light motion on a committee sale.

## Why it is different from asking Claude directly
The Pipedrive MCP gives Claude access to your data. This skill gives Claude a consistent, calibrated method over that data: the same deal always gets the same verdict, grounded in a proven sales framework, with a report a CEO and an account executive read the same way every time.

## Install
1. Download this repo into your Claude Code skills folder:
   - macOS/Linux: `~/.claude/skills/`
   - Windows: `%USERPROFILE%\.claude\skills\`
   The result should be `.../.claude/skills/deal-motion-router/SKILL.md`.
2. Restart Claude Code.
3. Run setup, once: say `run setup for deal motion router`. It reads your Pipedrive fields and configures itself to your instance in one conversation.
4. Then: `audit the deals that passed discovery this month`.

## Requirements
- Claude Code.
- The Pipedrive MCP connected (read-only is enough). Works with `@ckalima/pipedrive-mcp-server`.
- Node.js 18 or higher (the same one your MCP uses).

No dependencies to install. The skill never writes to your CRM.

## What it produces
A per-account report: the motion verdict, a buying-committee map with the gaps marked, your touches vs the benchmark for that size, a readiness score from 0 to 100, and what to fill to raise your probability of closing. Anything the analyzer cannot determine, it says, instead of guessing.

## Tests
From the skill folder: `node --test`. No Pipedrive needed.

## License
MIT. Built by Josué Urizar.
