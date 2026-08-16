// Local preset plugin: durable prompt re-read reminders.
//
// The user's research prompt is usually a local file. This plugin injects a
// model-visible reminder (as a durable user message, not a system-prompt
// section, so `persona.complete: true` cannot suppress it):
//   * immediately after a context compaction checkpoint lands;
//   * periodically, by default at most once every 30 minutes of step activity.
//
// The reminder names the authoritative prompt file(s) found in the workspace
// file `.dsh-prompt-path` (one absolute or workspace-relative path per line).
// The root agent is expected to keep that file up to date whenever the user
// gives a local-file prompt; the plugin deliberately only re-reads the list
// of paths, never the prompt contents, so the model must open the real file.

import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const name = 'prompt-recheck'
export const inject = ['agents']

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000
const DEFAULT_PATH_REGISTRY = '.dsh-prompt-path'
const MAX_PROMPT_FILES = 16
const TAIL_SCAN_LIMIT = 200

export function normalizeConfig(config = {}) {
  const intervalMs = config.intervalMs ?? DEFAULT_INTERVAL_MS
  if (!Number.isInteger(intervalMs) || intervalMs < 0) {
    throw new Error(`prompt-recheck: intervalMs must be a non-negative integer, got ${String(intervalMs)}`)
  }
  const pathRegistryFile = config.pathRegistryFile ?? DEFAULT_PATH_REGISTRY
  if (typeof pathRegistryFile !== 'string' || pathRegistryFile.trim() === '') {
    throw new Error('prompt-recheck: pathRegistryFile must be a non-empty string')
  }
  const promptFile = config.promptFile
  if (promptFile !== undefined && (typeof promptFile !== 'string' || promptFile.trim() === '')) {
    throw new Error('prompt-recheck: promptFile must be a non-empty string when set')
  }
  return { intervalMs, pathRegistryFile: pathRegistryFile.trim(), promptFile }
}

export function parsePromptPaths(raw, cwd) {
  const lines = String(raw).split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
  const resolved = []
  for (const line of lines) {
    try {
      resolved.push(path.resolve(cwd, line))
    } catch {
      // Ignore a malformed entry (for example one containing a NUL byte)
      // instead of letting one bad line abort the model step.
    }
  }
  return [...new Set(resolved)].slice(0, MAX_PROMPT_FILES)
}

export async function resolvePromptPaths(agent, config) {
  const cwd = agent.session?.header?.cwd ?? process.cwd()
  const registryFile = path.resolve(cwd, config.pathRegistryFile)
  let raw
  try {
    raw = await readFile(config.promptFile !== undefined ? path.resolve(cwd, config.promptFile) : registryFile, 'utf8')
  } catch {
    return { found: false, paths: [], registryFile }
  }
  const paths = config.promptFile !== undefined
    ? [path.resolve(cwd, config.promptFile)]
    : parsePromptPaths(raw, cwd)
  return { found: paths.length > 0, paths, registryFile }
}

export function renderReminder(kind, info) {
  const heading = kind === 'compaction'
    ? 'CONTEXT WAS JUST COMPACTED. PROMPT RE-READ REQUIRED BEFORE ANY OTHER ACTION.'
    : 'PERIODIC PROMPT RE-READ REQUIRED.'
  if (info.paths.length > 0) {
    const list = info.paths.map((file) => `- ${file}`).join('\n')
    return `${heading}\nThe authoritative prompt files recorded in ${info.registryFile} are:\n${list}\n\nRead every listed file now with str_replace_editor before doing any other work. Do not trust the compacted summary or your memory: those files are the source of truth. Then verify that the current direction still matches the prompt's exact definitions, quantifiers, and return criteria before continuing.`
  }
  return `${heading}\nNo prompt file is recorded at ${info.registryFile}. Re-read the user's original prompt from the conversation if it is still present. If the prompt was given as a local file, ask the user for its path, record one absolute path per line in ${info.registryFile}, and read the file before continuing.`
}

export function createReminderMessage(text) {
  return {
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'plugin', plugin: name, form: 'reminder' },
  }
}

export function latestCompactionIdInTail(agent) {
  const events = agent.session?.events
  if (!Array.isArray(events)) return undefined
  const start = Math.max(0, events.length - TAIL_SCAN_LIMIT)
  for (let index = events.length - 1; index >= start; index--) {
    const event = events[index]
    if (event?.type === 'compaction/summary') return event.data?.compactionId ?? event.seq
  }
  return undefined
}

export function createPromptRechecker(config = {}) {
  const cfg = normalizeConfig(config)
  const latestCompactionBySession = new WeakMap()
  const seenCompactionByAgent = new WeakMap()
  const lastReminderByAgent = new WeakMap()

  function observeSession(session, event) {
    if (event?.type !== 'compaction/summary') return
    latestCompactionBySession.set(session, event.data?.compactionId ?? event.seq)
  }

  async function preStep({ agent, signal }, next) {
    const decision = await next()
    if (decision.kind !== 'enter' || signal.aborted) return decision

    // Only the root agent owns the prompt-file re-read discipline. Child
    // subagents receive their own self-contained task in their prompt.
    const delegationDepth = agent.session?.header?.delegationDepth ?? 0
    if (delegationDepth > 0) return decision

    const latestCompaction = latestCompactionBySession.get(agent.session) ?? latestCompactionIdInTail(agent)
    const justCompacted = latestCompaction !== undefined && latestCompaction !== seenCompactionByAgent.get(agent)
    if (justCompacted) seenCompactionByAgent.set(agent, latestCompaction)

    const now = Date.now()
    const previousReminder = lastReminderByAgent.get(agent)
    let due = false
    if (previousReminder === undefined) {
      lastReminderByAgent.set(agent, now)
    } else if (cfg.intervalMs > 0 && now - previousReminder >= cfg.intervalMs) {
      due = true
    }

    if (!justCompacted && !due) return decision
    if (due) lastReminderByAgent.set(agent, now)

    const info = await resolvePromptPaths(agent, cfg)
    const reminder = createReminderMessage(renderReminder(justCompacted ? 'compaction' : 'periodic', info))
    return {
      kind: 'enter',
      messages: [...decision.messages, reminder],
    }
  }

  return { config: cfg, observeSession, preStep }
}

export function apply(ctx, config = {}) {
  const checker = createPromptRechecker(config)
  ctx.on('session/event', checker.observeSession)
  ctx.on('agent/pre-step', checker.preStep)
}
