import { ForLoopAPIClient } from '../capabilities/api-client';
import type { WriteConversationEventInput } from '../capabilities/api-client';
import { isLambdaExecution } from '../capabilities/config';
import fs from 'fs';
import path from 'path';

interface PendingUserMessage {
  messageId: string;
  content: string;
  agent: string;
  model: any;
  timestamp: number;
}

function normalizeAgentKey(agent: string): string {
  return agent;
}

function getActor(): { senderType: string; senderId: string } {
  return {
    senderType: process.env.FORLOOP_SENDER_TYPE || 'user',
    senderId: process.env.FORLOOP_SENDER_ID || 'unknown',
  };
}

function buildConversationId(sprintId: number, agent: string, sessionId: string): string {
  const actor = getActor();
  return `sprint:${sprintId}:agent:${agent}:${actor.senderType}:${actor.senderId}`;
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

const userMessageBuffer = new Map<string, PendingUserMessage>();

async function writeConversationTurn(
  client: ForLoopAPIClient,
  input: WriteConversationEventInput,
  attempts: number
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 600 * i));
      }
      const result = await client.writeConversationEvent(input);
      if (!result?.ok) {
        console.warn(`[ForLoop] Write event returned not ok: ${result?.error || 'unknown'}`);
      }
      return;
    } catch (err: any) {
      console.warn(`[ForLoop] Write event attempt ${i + 1}/${attempts} failed:`, err.message);
      if (i === attempts - 1) {
        console.warn('[ForLoop] Failed to write conversation event after all retries');
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

    if (content && messageID) {
      console.log(`[ForLoop] REQUEST — user message (${content.length} chars)`, {
        sprintId,
        agent: agent || 'unknown',
        sessionId: sessionID,
        preview: content.substring(0, 300),
      });
    }

    if (!model || !model.providerID) return;
    if (!content) return;

    userMessageBuffer.set(sessionID, {
      messageId: messageID || message.id,
      content,
      agent: agent || 'unknown',
      model,
      timestamp: message.time?.created ?? Date.now(),
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

          const pendingUserMsg = userMessageBuffer.get(info.sessionID);
          userMessageBuffer.delete(info.sessionID);

          if (!pendingUserMsg) {
            console.log('[ForLoop] Skipping write — no buffered user message for this session (stream handler handles the save)');
            break;
          }

          const conversationId = buildConversationId(
            sprintId,
            info.agent || 'unknown',
            info.sessionID
          );
          writeConversationTurn(client, {
            operation: 'append_turn',
            sprintId,
            targetAgent: info.agent ? normalizeAgentKey(info.agent) : 'unknown',
            actor: getActor(),
            conversationId,
            sessionId: info.sessionID,
            messageId: info.id,
            userMessage: pendingUserMsg.content,
            agentResponse: bufferedText,
            metadata: {
              source: 'opencode-plugin',
              agent: info.agent ? normalizeAgentKey(info.agent) : null,
              model: info.model || null,
              userMessageId: pendingUserMsg.messageId || null,
              recordedAt: info.time?.created ?? Date.now(),
            },
          }, 3);
          break;
        }
        case 'message.removed': {
          const { sessionID, messageID } = event.properties || {};
          if (!sessionID || !messageID) break;
          textBuffer.delete(messageID);
          const conversationId = buildConversationId(sprintId, 'unknown', sessionID);
          client.writeConversationEvent({
            operation: 'delete_turn',
            sprintId,
            targetAgent: 'forLoopPlanner',
            actor: getActor(),
            conversationId,
            messageId: messageID,
            metadata: { source: 'opencode-plugin' },
          }).catch((err: Error) => {
            console.warn('[ForLoop] Failed to delete conversation turn:', err.message);
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
        const pendingUserMsg = userMessageBuffer.get(info.sessionID);
        userMessageBuffer.delete(info.sessionID);

        if (!pendingUserMsg) {
          console.log('[ForLoop] Skipping write — no buffered user message for this session');
          break;
        }

        const conversationId = buildConversationId(
          sprintId,
          info.agent || 'unknown',
          info.sessionID
        );
        writeConversationTurn(client, {
          operation: 'append_turn',
          sprintId,
          targetAgent: info.agent ? normalizeAgentKey(info.agent) : 'unknown',
          actor: getActor(),
          conversationId,
          sessionId: info.sessionID,
          messageId: info.id,
          userMessage: pendingUserMsg.content,
          agentResponse: bufferedText,
          metadata: {
            source: 'opencode-plugin',
            agent: info.agent ? normalizeAgentKey(info.agent) : null,
            model: info.model || null,
            userMessageId: pendingUserMsg.messageId || null,
            recordedAt: info.time?.created ?? Date.now(),
          },
        }, 3);
        break;
      }
      case 'message.removed': {
        const { sessionID, messageID } = event.properties || {};
        if (!sessionID || !messageID) return;
        textBuffer.delete(messageID);
        const conversationId = buildConversationId(sprintId, 'unknown', sessionID);
        client.writeConversationEvent({
          operation: 'delete_turn',
          sprintId,
          targetAgent: 'forLoopPlanner',
          actor: getActor(),
          conversationId,
          messageId: messageID,
          metadata: { source: 'opencode-plugin' },
        }).catch((err: Error) => {
          console.warn('[ForLoop] Failed to delete conversation turn:', err.message);
        });
        break;
      }
    }
  };
}
