// GENERATED from server_lambda_shared/src/services/conversationInjection.ts — do not edit. Run: node scripts/sync_conversation_id.mjs
export interface InjectionBudget {
  maxTurns?: number
  maxSummaryChars?: number
  maxCharsPerTurn?: number
}

export interface InjectedSummary {
  text: string
  roundsCovered: string | null
  timestamp?: Date | string | null
  owner?: string
}

export interface InjectedTurn {
  id?: number
  conversationId?: string
  timestamp?: Date | string | null
  userMessage: string
  agentResponse: string
  metadata?: unknown
}

export interface InjectionSource {
  summaries: InjectedSummary[]
  turns: InjectedTurn[]
}

export interface InjectedContext {
  summaries: InjectedSummary[]
  turns: InjectedTurn[]
}

function trunc(s: string, n: number): string {
  return Number.isFinite(n) && n > 0 && s.length > n ? s.slice(0, n) + '... [truncated]' : s
}

export function buildInjectedContext(view: InjectionSource, budget: InjectionBudget = {}): InjectedContext {
  const coveredEnd = view.summaries.reduce((max, s) => {
    const end = Number(String(s.roundsCovered || '').split('-')[1])
    return Number.isFinite(end) && end > max ? end : max
  }, 0)
  const maxTurns = budget.maxTurns ?? Infinity
  const maxPer = budget.maxCharsPerTurn ?? Infinity
  const maxSummary = budget.maxSummaryChars ?? Infinity
  const turns = view.turns
    .filter((_, i) => i + 1 > coveredEnd) // positional: drop turns already covered by a summary
    .slice(-maxTurns)
    .map((t) => ({ ...t, userMessage: trunc(t.userMessage, maxPer), agentResponse: trunc(t.agentResponse, maxPer) }))
  // The summary block is capped in aggregate: join all summaries into one text
  // and truncate once, so the injected context holds a single capped summary.
  const combined = view.summaries.map((s) => s.text).filter(Boolean).join('\n\n')
  const capped = trunc(combined, maxSummary)
  const anchor = view.summaries.reduce((best, s) => {
    const e = Number(String(s.roundsCovered || '').split('-')[1])
    const b = Number(String(best?.roundsCovered || '').split('-')[1])
    return Number.isFinite(e) && (!best || !Number.isFinite(b) || e > b) ? s : best
  }, undefined as InjectedSummary | undefined)
  const summaries = capped && anchor ? [{ ...anchor, text: capped }] : []
  return { summaries, turns }
}

export function renderChatMessages(ctx: InjectedContext): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const out: { role: 'system' | 'user' | 'assistant'; content: string }[] = []
  for (const s of ctx.summaries) if (s.text) out.push({ role: 'system', content: s.text })
  for (const t of ctx.turns) {
    if (t.userMessage) out.push({ role: 'user', content: t.userMessage })
    if (t.agentResponse) out.push({ role: 'assistant', content: t.agentResponse })
  }
  return out
}

export function renderPromptSection(ctx: InjectedContext): string {
  const parts: string[] = []
  const summaryText = ctx.summaries.map((s) => s.text).filter(Boolean).join('\n\n')
  if (summaryText) { parts.push('Conversation summary:'); parts.push(summaryText) }
  if (ctx.turns.length) {
    parts.push('Conversation history:')
    for (const t of ctx.turns) {
      if (t.userMessage) parts.push(`user: ${t.userMessage}`)
      if (t.agentResponse) parts.push(`assistant: ${t.agentResponse}`)
    }
  }
  return parts.join('\n')
}
