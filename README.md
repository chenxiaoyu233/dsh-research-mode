# DSH CDC Minimal Research Preset

An experimental [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness)
agent preset for mathematical research. The goal of this project is to explore
the boundaries of what DSH can do for long-horizon mathematical work: a small,
deliberately minimal tool surface, an aggressive subagent-driven search
protocol, and strict return discipline inspired by the OpenAI CDC prompt.

This is a user-authored preset, not an official DeepSeek product.

## Design

### Root agent: research-loop owner

The root agent thinks actively at the high level — possible routes, strategy,
and priorities — while delegating tedious calculation, verification, coding,
and numerical experiments to subagents. It maintains the research loop and
enforces the rules:

- Concrete agent scheduling follows the OpenAI CDC prompt: a diverse dynamic
  portfolio of subagents, an approach-family registry, adversarial audit of
  every candidate, and literature-grounded research before new ideas are
  invented from scratch.
- The root repeatedly re-reads the user's prompt, tracks the high-level
  progress map, proposes batches of intermediate conjectures, and delegates
  detailed work. It normally consumes subagent summaries but may inspect any
  proof, code, data, or note directly whenever that helps, or ask a subagent
  for a focused explanation.
- Numerical experiments are evidence, not truth. A computational result may
  redirect the search only after independent checks or reproduction; a buggy
  subagent script must never steer the portfolio.
- Conjecture screening is a fallback: use it when the loop runs out of
  genuinely distinct ideas, and treat survivors only as hints for a fresh
  theoretical direction.
- Return discipline: a complete proof or fully verified counterexample that
  survives two independent adversarial audits is returned immediately.
  Otherwise the root keeps working for at least 8 hours of effective effort
  and may then return only the strongest rigorous derivation plus its exact
  remaining gap, clearly labeled as not a resolution.

### Subagents

Subagents do the thinking, coding, careful numerical experiments, auditing,
and note writing. Delegation depth is capped at 2.

- `subagent` — `deepseek-v4-pro`, for proofs, reductions, adversarial audit,
  final verification, and everything else the root delegates.
- Calls are continuable by default: they return a durable subagent id and the
  parent receives a settlement notice when a child finishes.

### Tool inventory

Model-facing tools:

| Tool | Purpose |
|---|---|
| `bash` | Persistent shell for housekeeping, reading, and verification |
| `str_replace_editor` | View / create / edit files |
| `web_search` | Literature grounding; cite sources; verify before use in a proof |
| `subagent` | Continuable pro-tier research worker |
| `send_message` | Queue a follow-up turn for a direct child |
| `interrupt_agent` | Stop a stuck child or descendant's current turn |
| `list_agents` | Snapshot status of children / descendants |

Continuable children also receive the host-provided `report` tool, so they can
send a child-to-parent message outside the normal settlement path.

Non-tool machinery mounted by the preset:

- `dsh-time-context` — injects current time and browser timezone readings.
- `dsh-compaction-basic` — automatic and manual context compaction.
- `prompt-recheck.js` — local plugin that injects a durable reminder to
  re-read `.dsh-prompt-path` after every compaction and every 20 minutes.

## Installation

The preset id is the directory name, so clone it to exactly this path:

```bash
git clone <your-repository-url> ~/.dsh/.agent-presets/minimal-web-subagent
```

Then refresh the DSH web UI and start a new session with
**CDC Minimal Research Mode**.

Tested with `@deepseek-ai/dsh` `0.1.0-rc.6`.

### Optional: quieter child reports

The child-side `report` tool is host configuration and cannot be mounted by an
agent preset. To inject child reports into the parent's next request instead
of waking/queuing a separate turn, copy the entry from
`profile-patch.example.yml` into `~/.dsh/profiles/web/cordis.patch.yml`, then
restart `dsh web`.

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
- `prompt-recheck`: `intervalMs` (default `1200000`, 20 minutes) and the
  prompt-path registry filename
- `tool-subagent`: model tier, `maxDepth`, worker persona, and delegation policy
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
| `profile-patch.example.yml` | Optional host-profile patch for quiet child reports |
| `package.json` | Marks the preset directory as an ES module |
| `LICENSE` | MIT license |

## License

[MIT](LICENSE)
