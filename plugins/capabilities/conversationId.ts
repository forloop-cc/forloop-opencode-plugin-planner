// GENERATED from server_lambda_shared/src/services/conversationId.ts — do not edit. Run: node scripts/sync_conversation_id.mjs
// Single source of truth for conversation/context ids. Dependency-free.
export const PLANNER_AGENT_KEY = 'forLoopPlanner'
export const A2A_PEER_AGENT_KEY = 'a2a-peer'

const SENDER_TYPES = new Set(['user', 'agent', 'system', 'appuser'])

export type SenderType = 'user' | 'agent' | 'system' | 'appuser'
export type ConversationIdKind = 'agent' | 'appuser' | 'meeting' | 'summary' | 'unknown'

export interface ParsedConversationId {
  kind: ConversationIdKind
  raw: string
  sprintId: number | null
  agentKey?: string
  senderType?: string
  senderId?: string
  sessionId?: string | null
  userId?: string
  meetingId?: string
  threadKey?: string
  range?: string
}

export interface BuildAgentThreadInput {
  sprintId: number
  agentKey: string
  senderType: SenderType
  senderId: string | number
  sessionId?: string | null
}

export function buildAgentThreadId(input: BuildAgentThreadInput): string {
  const base = `sprint:${input.sprintId}:agent:${input.agentKey}:${input.senderType}:${input.senderId}`
  const session = input.sessionId != null && String(input.sessionId).trim() ? String(input.sessionId).trim() : null
  return session ? `${base}:session:${session}` : base
}

export function buildAppUserThreadId(sprintId: number, agentPublicId: string, userId: number | string): string {
  return `sprint:${sprintId}:agent:${agentPublicId}:appuser:${userId}`
}

export function buildMeetingThreadId(sprintId: number, meetingId: string, userId: number | string): string {
  return `sprint:${sprintId}:meeting:${meetingId}:summary:user:${userId}`
}

export function buildSummaryId(input: { sprintId: number; agentKey: string; threadKey?: string; rangeStart: number; rangeEnd: number }): string {
  const prefix = `sprint:${input.sprintId}:agent:${input.agentKey}:summary:`
  return input.threadKey
    ? `${prefix}${input.threadKey}:${input.rangeStart}-${input.rangeEnd}`
    : `${prefix}${input.rangeStart}-${input.rangeEnd}`
}

export function webAppThreadId(sprintId: number, userId: number | string): string {
  return buildAgentThreadId({ sprintId, agentKey: PLANNER_AGENT_KEY, senderType: 'user', senderId: userId })
}

const isNum = (v: string | undefined): number | null => {
  if (v === undefined || !/^-?\d+$/.test(v)) return null
  return Number(v)
}

export function parseConversationId(id: string): ParsedConversationId {
  const raw = String(id ?? '')
  const parts = raw.split(':')
  const unknown: ParsedConversationId = { kind: 'unknown', raw, sprintId: null }
  if (parts[0] !== 'sprint' || parts.length < 3) return unknown
  const sprintId = isNum(parts[1])
  if (sprintId === null) return unknown

  if (parts[2] === 'appuser') {
    const userId = parts.slice(3).join(':')
    if (!userId) return unknown
    return { kind: 'appuser', raw, sprintId, userId }
  }
  if (parts[2] === 'meeting' && parts.length >= 4 && parts[3]) {
    const userId = parts[4] === 'summary' && parts[5] === 'user' ? parts.slice(6).join(':') : undefined
    return { kind: 'meeting', raw, sprintId, meetingId: parts[3], ...(userId ? { userId } : {}) }
  }
  if (parts[2] === 'agent' && parts.length >= 6) {
    const agentKey = parts[3]
    if (!agentKey) return unknown
    const senderType = parts[4]
    const sessionIdx = parts.indexOf('session', 5)
    const hasSession = sessionIdx >= 5
    const senderId = (hasSession ? parts.slice(5, sessionIdx) : parts.slice(5)).join(':')
    const sessionId = hasSession ? parts.slice(sessionIdx + 1).join(':') || null : null
    if (senderType === 'summary') {
      const rest = parts.slice(5).join(':')
      // Legacy: `sprint:{id}:agent:{agent}:summary:{start}-{end}` (no threadKey).
      if (/^\d+-\d+$/.test(rest)) {
        return { kind: 'summary', raw, sprintId, agentKey, range: rest }
      }
      // Thread-scoped: `...:summary:{threadKey}:{start}-{end}` where threadKey contains colons.
      const m = rest.match(/^(.*):(\d+-\d+)$/)
      if (m) {
        return { kind: 'summary', raw, sprintId, agentKey, threadKey: m[1], range: m[2] }
      }
      return { kind: 'summary', raw, sprintId, agentKey, ...(rest ? { threadKey: rest } : {}) }
    }
    if (!senderId || !SENDER_TYPES.has(senderType)) return unknown
    return { kind: 'agent', raw, sprintId, agentKey, senderType, senderId, sessionId }
  }
  return unknown
}

export function isCanonicalConversationId(id: string): boolean {
  return parseConversationId(id).kind !== 'unknown'
}

export function isAppUserThread(id: string): boolean {
  const p = parseConversationId(id)
  return p.kind === 'appuser' || (p.kind === 'agent' && p.senderType === 'appuser')
}

export function validateConversationId(id: string): { ok: true } | { ok: false; error: string } {
  return isCanonicalConversationId(id) ? { ok: true } : { ok: false, error: 'Invalid conversationId format' }
}

// One thread per producer: the producer's canonical base id with any `:session:`
// suffix stripped, so each sender (web human, AI user, chrome extension, peer,
// appuser) owns its own channel and only its own sessions collapse into it.
// Producers are never folded into one another.
export function conversationGroupKey(id: string): string | null {
  const p = parseConversationId(id)
  if (p.kind === 'unknown' || p.sprintId === null) return null
  if (p.kind === 'agent') {
    if (!p.agentKey) return null
    return `sprint:${p.sprintId}:agent:${p.agentKey}:${p.senderType}:${p.senderId}`
  }
  if (p.kind === 'appuser') return id
  if (p.kind === 'meeting') return id
  // summary rows are attributed separately, not listed as channels
  return null
}
