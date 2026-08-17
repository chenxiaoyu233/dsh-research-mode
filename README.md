# DSH CDC Minimal Research Preset

An experimental [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness)
agent preset for mathematical research. The goal of this project is to explore
the boundaries of what DSH can do for long-horizon mathematical work: a small,
deliberately minimal tool surface, an aggressive subagent-driven search
protocol, and strict return discipline inspired by the OpenAI CDC prompt.

This is a user-authored preset, not an official DeepSeek product.

## Design

### Root agent: research-loop owner

The root agent does not do mathematics, write code, or run experiments itself.
It only maintains the research loop and enforces the rules:

- Concrete agent scheduling follows the OpenAI CDC prompt: a diverse dynamic
  portfolio of subagents, an approach-family registry, adversarial audit of
  every candidate, and a research route built around large-scale numerical
  counterexample search / conjecture screening.
- The root repeatedly re-reads the user's prompt, tracks the high-level
  progress map, proposes batches of intermediate conjectures, and delegates
  all detailed work.
- Return discipline: a complete proof or fully verified counterexample that
  survives two independent adversarial audits is returned immediately.
  Otherwise the root keeps working for at least 8 hours of effective effort
  and may then return only the strongest rigorous derivation plus its exact
  remaining gap, clearly labeled as not a resolution.
- The root also treats session cost as a standing objective. Unless the user
  has already stated a cost priority, it asks once (economy-first / balanced /
  rigor-first) before a large research program.

### Subagents: flexible model routing

Subagents do the thinking, coding, numerical screening, auditing, and note
writing. Delegation depth is capped at 2.

- `subagent` — `deepseek-v4-pro`, for proofs, reductions, adversarial audit,
  final verification, and anything proof-critical.
- `subagent_flash` — `deepseek-v4-flash`, for numerical/mechanical screening,
  coding, formatting, and note writing.
- Both are continuable: calls return a durable subagent id and the parent
  receives a settlement notice when a child finishes.
- The initial flash/pro mapping is only a suggestion. The root promotes a task
  class to pro when flash output is ambiguous, proof-relevant, or fails twice;
  it demotes a class to flash when pro is repeatedly unnecessary. The current
  policy lives in `research/registry.md`.

### Tool inventory

Model-facing tools:

| Tool | Purpose |
|---|---|
| `bash` | Persistent shell for housekeeping, reading, and verification |
| `str_replace_editor` | View / create / edit files |
| `web_search` | Background and standard named theorems only |
| `subagent` | Continuable pro-tier research worker |
| `subagent_flash` | Continuable flash-tier cheap worker |
| `send_message` | Queue a follow-up turn for a direct child |
| `interrupt_agent` | Stop a stuck child or descendant's current turn |
| `list_agents` | Snapshot status of children / descendants |

Continuable children also receive the host-provided `report` tool, so they can
send a child-to-parent message outside the normal settlement path.

Non-tool machinery mounted by the preset:

- `dsh-time-context` — injects current time and browser timezone readings.
- `dsh-compaction-basic` — automatic and manual context compaction.
- `prompt-recheck.js` — local plugin that injects a durable reminder to
  re-read `.dsh-prompt-path` after every compaction and every 30 minutes.

## Installation

The preset id is the directory name, so clone it to exactly this path:

```bash
git clone <your-repository-url> ~/.dsh/.agent-presets/minimal-web-subagent
```

Then refresh the DSH web UI and start a new session with
**CDC Minimal Research Mode**.

Tested with `@deepseek-ai/dsh` `0.1.0-rc.6`.

## Usage

- Put the research prompt in a local file and give its path to the agent.
  The root agent records the path in the workspace file `.dsh-prompt-path`.
- Intermediate scripts, data, logs, plots, and notes all go directly into the
  flat workspace directory `.dsh-generated/` with short descriptive names.
- Let the root agent manage the search. Do not expect it to write code or
  prove lemmas itself; that work belongs to subagents.

## Configuration

Edit `agent.cordis.yml` to adjust:

- `time-context`: fallback `timeZone` and refresh interval
- `prompt-recheck`: `intervalMs` (default `1800000`, 30 minutes) and the
  prompt-path registry filename
- `tool-subagent` / `tool-subagent-flash`: model tier, `maxDepth`, worker persona, and delegation policy
- `tool-subagent-control` / `tool-subagent-list-agents`: follow-up, interrupt, and status tools

Note: DSH detects preset changes from `agent.cordis.yml`. If you edit only
`prompt-recheck.js`, touch `agent.cordis.yml` (or change a comment) so new
sessions mount the updated plugin. Sessions that have already started keep
the generation they were created with.

## Repository contents

| File | Purpose |
|---|---|
| `agent.cordis.yml` | The preset composition |
| `preset.yml` | Display metadata for the mode picker |
| `prompt-recheck.js` | Local plugin that injects durable prompt re-read reminders |
| `package.json` | Marks the preset directory as an ES module |

## License

See `LICENSE` (choose one before publishing).
