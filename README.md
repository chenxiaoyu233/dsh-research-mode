# DSH CDC Minimal Research Preset

An experimental [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness)
agent preset for mathematical research. The goal of this project is to explore
the boundaries of what DSH can do for long-horizon mathematical work: a small,
deliberately minimal tool surface, an aggressive subagent-driven search
protocol, and strict return discipline inspired by the OpenAI CDC prompt.

This is a user-authored preset, not an official DeepSeek product.

## What it is

`minimal-web-subagent` is built on top of the shipped `minimal` preset. It
keeps the minimal core and adds only a few research-oriented capabilities:

- `bash` (persistent) and `str_replace_editor`
- `web_search` (search only, no arbitrary `web_fetch`)
- one foreground `subagent` tool; child results return to the parent agent
- automatic time context
- automatic context compaction
- a local `prompt-recheck` plugin that forces the root agent to re-read the
  user's prompt file after every compaction and at regular intervals

The persona implements a research-director workflow:

- The **root agent** owns the process. It remembers the user's prompt,
  maintains the high-level progress map, proposes large batches of
  intermediate conjectures, and delegates all detailed work.
- **Subagents** do the thinking, coding, numerical experiments, and note
  writing. Depth is capped at 2 so workers can split one bounded level of
  their own task.
- Every candidate must pass adversarial audit.
- The root agent may return only a complete resolution (or, after the
  8-hour effort budget, the strongest rigorous derivation with its exact
  remaining gap, clearly labeled as not a resolution).

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
- `tool-subagent`: `maxDepth`, worker persona, and delegation policy

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
