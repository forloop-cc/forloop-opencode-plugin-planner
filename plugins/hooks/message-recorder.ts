import { ForLoopAPIClient } from '../capabilities/api-client';
import type { MessageRecord } from '../capabilities/api-client';
import { isLambdaExecution } from '../capabilities/config';
import fs from 'fs';
import path from 'path';

function normalizeAgentKey(agent: string): string {
  if (/^forLoop[A-Z]/.test(agent)) {
    return (
      'forloop-' +
      agent
        .slice(7)
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase()
    );
  }
  return agent
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function buildConversationId(sprintId: number, agent: string, sessionId: string): string {
  const senderType = process.env.FORLOOP_SENDER_TYPE || 'user';
  const senderId = process.env.FORLOOP_SENDER_ID || 'unknown';
  return `sprint:${sprintId}:agent:${agent}:${senderType}:${senderId}`;
}

function readActiveSprintId(): number | null {
  try {
    const home = process.env.HOME || '/tmp/home';
    const manifestPath = path.join(home, '.forloop', 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    const id = parsed?.activeSprintId;
    return Number.isFinite(id) ? Number(id) : null;
  } catch {
    return null;
  }
}

async function recordAssistantMessage(
  client: ForLoopAPIClient,
  data: MessageRecord,
  attempts: number
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 600 * i));
      }
      const result = await client.recordMessage(data);
      if (result?.message === 'no matching user message to update') {
        console.log(`[ForLoop] No matching user message — user message may not be recorded yet`);
        return;
      }
      // After recording, try summarization (no-op if < 30 rounds)
      client.summarizeConversation(data.sprintId).catch((err: Error) => {
        console.warn('[ForLoop] Summarization trigger failed:', err.message);
      });
      return;
    } catch (err: any) {
      console.warn(`[ForLoop] Attempt ${i + 1}/${attempts} failed:`, err.message);
      if (i === attempts - 1) {
        console.warn('[ForLoop] Failed to record assistant message after all retries');
      }
    }
  }
}

function extractTextFromParts(parts: any[]): string {
  return parts
    .filter((p: any) => p.type === 'text')
    .map((p: any) => p.text || '')
    .join('');
}

export function createChatMessageHook(client: ForLoopAPIClient) {
  return async (input: any, output: any) => {
    const sprintId = readActiveSprintId();
    if (!sprintId) return;

    const { sessionID, agent, model, messageID } = input;
    const { message, parts } = output;
    const content = extractTextFromParts(parts);

    // Log incoming user message for debug visibility (Lambda)
    if (content && messageID) {
      console.log(`[ForLoop] REQUEST — user message (${content.length} chars)`, {
        sprintId,
        agent: agent || 'unknown',
        sessionId: sessionID,
        preview: content.substring(0, 300),
      });
    }

    // Only record messages with a model (indicates actual LLM processing,
    // not system events like context compaction or summary generation)
    if (!model || !model.providerID) return;

    const conversationId = buildConversationId(sprintId, agent || 'unknown', sessionID);

    // Fire-and-forget: don't await - must not block the LLM from receiving the message
    client.recordMessage({
      sprintId,
      sessionId: sessionID,
      messageId: messageID || message.id,
      conversationId,
      role: 'user',
      content,
      agent: agent ? normalizeAgentKey(agent) : undefined,
      model,
      timestamp: message.time?.created ?? Date.now(),
    }).catch((err: Error) => {
      console.warn('[ForLoop] Failed to record user message:', err.message);
    });
  };
}

export function createEventHook(client: ForLoopAPIClient) {
  const textBuffer = new Map<string, string>();
  const readyToStream = new Set<string>(); // messageIDs that have passed the context phase
  const directSentText = new Map<string, string>(); // trackingId → last full text sent via direct HTTP

  const sendStreamDelta = (sprintId: number, trackingId: string, taskId: string, fullText: string) => {
    const lastSent = directSentText.get(trackingId) || '';
    if (!fullText || fullText.length <= lastSent.length) return;
    const delta = fullText.startsWith(lastSent) ? fullText.substring(lastSent.length) : fullText;
    if (!delta) return;
    directSentText.set(trackingId, fullText);
    client.sendStreamChunk({
      taskId: taskId || '',
      trackingId,
      sprintId,
      chunk: delta,
      index: 0,
    }).catch((err: Error) => {
      console.warn('[ForLoop] Direct stream chunk failed:', err.message);
    });
  };

  return async ({ event }: { event: { type: string; properties: any } }) => {
    const sprintId = readActiveSprintId();
    if (!sprintId) return;

    const trackingId = process.env.FORLOOP_TRACKING_ID;
    const taskId = process.env.FORLOOP_TASK_ID;
    const isLambda = isLambdaExecution();
    const debugStream = process.env.FORLOOP_DEBUG_STREAM === 'true';

    // Lambda with streaming: send chunks directly via HTTP
    if (isLambda && trackingId && process.env.FORLOOP_STREAM_ENABLED === 'true') {
      switch (event.type) {
        case 'message.part.updated': {
          const part = event.properties?.part;
          const messageID = part?.messageID || '';
          if (debugStream) console.error('[stream-event] message.part.updated', { type: part?.type, trackingId, sprintId, messageID });

          // Skip non-text parts — but track that this messageID is now in "generation" phase
          if (!part || part.type !== 'text') {
            if (messageID && (part?.type === 'reasoning' || part?.type === 'tool' || part?.type === 'step-start')) {
              readyToStream.add(messageID);
            }
            break;
          }

          // Skip the initial context text (the conversation history loaded by the agent).
          // Context text is massive (30K+ chars), assistant responses are small (<5K).
          // Also track that we've seen the context and subsequent text is streamable.
          const textLen = (part.text || '').length;
          if (!readyToStream.has(messageID) && textLen > 5000) {
            if (debugStream) console.error('[stream-event] skipping context text', { trackingId, messageID, textLen });
            readyToStream.add(messageID); // mark as past context
            break;
          }

          readyToStream.add(messageID);
          const current = textBuffer.get(part.messageID) || '';
          textBuffer.set(part.messageID, part.text || current);
          if (debugStream) console.error('[stream-event] writing chunk', { trackingId, textLen });

          // Send delta directly for real-time streaming (primary path)
          sendStreamDelta(sprintId, trackingId, taskId || '', part.text || '');
          break;
        }
        case 'message.updated': {
          const info = event.properties?.info;
          if (!info || info.role !== 'assistant') break;
          const bufferedText = textBuffer.get(info.id);
          if (!bufferedText) break;

          console.log(`[ForLoop] RESPONSE — planner message (${bufferedText.length} chars)`, {
            sprintId,
            trackingId,
            sessionId: info.sessionID,
            agent: info.agent || 'unknown',
            preview: bufferedText.substring(0, 500),
          });

          const conversationId = buildConversationId(
            sprintId,
            info.agent || 'unknown',
            info.sessionID
          );
          recordAssistantMessage(client, {
            sprintId,
            sessionId: info.sessionID,
            messageId: info.id,
            conversationId,
            role: 'assistant',
            content: bufferedText,
            agent: info.agent ? normalizeAgentKey(info.agent) : undefined,
            model: info.model,
            timestamp: info.time?.created ?? Date.now(),
          }, 3);
          break;
        }
        case 'message.removed': {
          const { sessionID, messageID } = event.properties || {};
          if (!sessionID || !messageID) break;
          textBuffer.delete(messageID);
          client.removeMessage(messageID, sprintId, sessionID).catch((err: Error) => {
            console.warn('[ForLoop] Failed to remove message:', err.message);
          });
          break;
        }
      }
      return;
    }

    // Record messages (works for local and Lambda)
    switch (event.type) {
      case 'message.part.updated': {
        const part = event.properties?.part;
        if (!part || part.type !== 'text') return;
        const current = textBuffer.get(part.messageID) || '';
        textBuffer.set(part.messageID, part.text || current);
        break;
      }
      case 'message.updated': {
        const info = event.properties?.info;
        if (!info || info.role !== 'assistant') return;
        const bufferedText = textBuffer.get(info.id);
        if (!bufferedText) return;
        const conversationId = buildConversationId(
          sprintId,
          info.agent || 'unknown',
          info.sessionID
        );
        recordAssistantMessage(client, {
          sprintId,
          sessionId: info.sessionID,
          messageId: info.id,
          conversationId,
          role: 'assistant',
          content: bufferedText,
          agent: info.agent ? normalizeAgentKey(info.agent) : undefined,
          model: info.model,
          timestamp: info.time?.created ?? Date.now(),
        }, 3);
        break;
      }
      case 'message.removed': {
        const { sessionID, messageID } = event.properties || {};
        if (!sessionID || !messageID) return;
        textBuffer.delete(messageID);
        client.removeMessage(messageID, sprintId, sessionID).catch((err: Error) => {
          console.warn('[ForLoop] Failed to remove message:', err.message);
        });
        break;
      }
    }
  };
}
