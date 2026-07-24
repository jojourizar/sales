# Contributing

Thanks for helping. This is a Claude Code skill: text instructions in `SKILL.md` plus a small, dependency-free Node engine in `lib/`.

## Ground rules
- The engine is deterministic and tested. Any change to `lib/` needs a test in `test/` and `node --test` must stay green.
- No runtime dependencies. Use the Node standard library only.
- Universal config lives in `config/defaults.json`. Anything instance-specific belongs in the user's generated `config/user-config.json`, never committed.
- The skill is read-only against Pipedrive. Do not add write operations.

## Running tests
`node --test` from the repo root.

## Ideas welcome
Portfolio roll-ups, more CRM adapters, better setup UX. Open an issue first for anything large.
