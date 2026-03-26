import { useState, useRef, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

interface ToolCall {
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  error?: string;
}

interface ADKPart {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; response?: unknown; id?: string };
}

interface ADKEvent {
  content?: { role?: string; parts?: ADKPart[] };
  author?: string;
  partial?: boolean;
  error_message?: string;
}

// ── Event parsing ──────────────────────────────────────────────────────────

function parseADKEvents(raw: unknown): Pick<Message, 'text' | 'thinking' | 'toolCalls'> {
  // ADK /run returns array of events; each event has content.parts
  const events: ADKEvent[] = Array.isArray(raw) ? raw : [];
  let thinking = '';
  let text = '';
  const toolCalls: ToolCall[] = [];
  const pendingById: Record<string, number> = {};

  for (const evt of events) {
    for (const part of evt.content?.parts ?? []) {
      // Thought / thinking content
      if (part.thought && part.text) {
        thinking += part.text;
        continue;
      }

      // Regular text — also detect <think>…</think> wrappers
      if (part.text) {
        const m = part.text.match(/^<think>([\s\S]*?)<\/think>([\s\S]*)$/s);
        if (m) {
          thinking += m[1];
          text += m[2].trim();
        } else {
          text += part.text;
        }
        continue;
      }

      // Tool call
      if (part.functionCall) {
        const fc = part.functionCall;
        const idx = toolCalls.length;
        toolCalls.push({ name: fc.name, args: fc.args });
        if (fc.id) pendingById[fc.id] = idx;
        continue;
      }

      // Tool result
      if (part.functionResponse) {
        const fr = part.functionResponse;
        let idx = fr.id !== undefined ? pendingById[fr.id] : undefined;
        if (idx === undefined) {
          idx = [...toolCalls].reverse().findIndex(c => c.result === undefined);
          if (idx !== -1) idx = toolCalls.length - 1 - idx;
        }
        if (typeof idx === 'number' && idx >= 0) {
          toolCalls[idx] = { ...toolCalls[idx], result: fr.response };
        }
      }
    }
  }

  return {
    text: text.trim(),
    thinking: thinking.trim() || undefined,
    toolCalls: toolCalls.length ? toolCalls : undefined,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 rounded border border-amber-200 bg-amber-50 text-xs">
      <button
        className="flex w-full items-center gap-1 px-3 py-1.5 text-amber-700 font-medium"
        onClick={() => setOpen(o => !o)}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>思考过程</span>
        {!open && (
          <span className="ml-2 text-amber-400 font-normal truncate max-w-[240px]">
            {text.slice(0, 80)}…
          </span>
        )}
      </button>
      {open && (
        <pre className="whitespace-pre-wrap break-words px-3 pb-2 text-amber-800 leading-relaxed">
          {text}
        </pre>
      )}
    </div>
  );
}

function ToolCallBlock({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1.5 rounded border border-blue-200 bg-blue-50 text-xs font-mono">
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-blue-700 font-medium font-sans"
        onClick={() => setOpen(o => !o)}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span className="text-blue-400">⚙</span>
        <span>{call.name}</span>
        {call.result !== undefined && (
          <span className="ml-auto text-green-600 text-[10px]">✓</span>
        )}
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1">
          {call.args !== undefined && (
            <div>
              <div className="text-blue-400 text-[10px] mb-0.5">Input</div>
              <pre className="whitespace-pre-wrap break-words text-blue-800">
                {JSON.stringify(call.args, null, 2)}
              </pre>
            </div>
          )}
          {call.result !== undefined && (
            <div>
              <div className="text-green-500 text-[10px] mb-0.5">Output</div>
              <pre className="whitespace-pre-wrap break-words text-green-800">
                {typeof call.result === 'string'
                  ? call.result
                  : JSON.stringify(call.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ msg, loading }: { msg: Message; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm px-1">
        <span className="animate-spin">⟳</span>
        <span>Agent 正在处理…</span>
      </div>
    );
  }

  if (msg.error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-red-700 text-sm max-w-[85%]">
        {msg.error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 max-w-[85%]">
      {msg.thinking && <ThinkingBlock text={msg.thinking} />}

      {msg.toolCalls && msg.toolCalls.length > 0 && (
        <div className="space-y-1">
          {msg.toolCalls.map((tc, i) => (
            <ToolCallBlock key={i} call={tc} />
          ))}
        </div>
      )}

      {msg.text && (
        <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2.5 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
          {msg.text}
        </div>
      )}

      {!msg.text && !msg.toolCalls?.length && !msg.thinking && (
        <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2.5 text-gray-400 text-sm italic">
          (空响应)
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const sessionId = useRef(uid());
  const bottomRef = useRef<HTMLDivElement>(null);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingId]);

  const send = async () => {
    const text = input.trim();
    if (!text || loadingId) return;

    const userMsg: Message = { id: uid(), role: 'user', text };
    const assistantId = uid();
    const placeholderMsg: Message = { id: assistantId, role: 'assistant', text: '' };

    setMessages(prev => [...prev, userMsg, placeholderMsg]);
    setInput('');
    setLoadingId(assistantId);

    try {
      const response = await fetch(`${apiUrl}/api/agent/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId.current }),
      });

      const json = await response.json();
      console.log('[ADK raw response]', json);

      if (!response.ok || !json.success) {
        throw new Error(json.detail || json.error || `HTTP ${response.status}`);
      }

      const parsed = parseADKEvents(json.response);
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, ...parsed } : m)
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, error: `请求失败: ${msg}` } : m)
      );
    } finally {
      setLoadingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center gap-2 shrink-0">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="font-semibold text-gray-700">AI Agent Chat</span>
        <span className="text-xs text-gray-400 ml-1">· 工具调用 + 思考过程</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20 text-sm">
            <div className="text-4xl mb-3">💬</div>
            <p>发送消息开始对话</p>
            <p className="text-xs mt-1 text-gray-300">工具调用和思考过程完成后展示</p>
          </div>
        )}

        {messages.map(msg =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-blue-500 text-white px-4 py-2.5 text-sm max-w-[75%] leading-relaxed">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start">
              <AssistantMessage
                msg={msg}
                loading={loadingId === msg.id}
              />
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-6 py-4 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors leading-relaxed"
            rows={1}
            placeholder="输入消息… (Enter 发送，Shift+Enter 换行)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!!loadingId}
            style={{ minHeight: '42px', maxHeight: '160px' }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 160) + 'px';
            }}
          />
          <button
            onClick={send}
            disabled={!!loadingId || !input.trim()}
            className="rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white px-4 py-2.5 text-sm font-medium transition-colors shrink-0"
          >
            {loadingId ? '…' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
