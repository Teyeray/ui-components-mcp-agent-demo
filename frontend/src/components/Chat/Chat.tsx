import { useState, useRef, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

type ConvItem =
  | { kind: 'user';  id: string; text: string }
  | { kind: 'text';  id: string; text: string; streaming: boolean }
  | { kind: 'tool';  id: string; name: string; args?: Record<string, unknown>; result?: unknown; callId?: string };

interface ADKPart {
  text?: string;
  thought?: boolean;
  functionCall?:    { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; response?: unknown; id?: string };
}
interface ADKEvent {
  content?: { parts?: ADKPart[] };
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2); }

// ── Tool bubble ────────────────────────────────────────────────────────────

function ToolBubble({ item }: { item: Extract<ConvItem, { kind: 'tool' }> }) {
  const [open, setOpen] = useState(false);
  const done = item.result !== undefined;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 text-xs font-mono w-fit max-w-[85%]">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 text-blue-700 font-sans font-medium text-sm w-full"
      >
        <span className="text-blue-400">⚙</span>
        <span>{item.name}</span>
        {done
          ? <span className="ml-1 text-green-500 text-xs">✓</span>
          : <span className="ml-1 text-amber-400 text-xs animate-pulse">…</span>}
        <span className="ml-3 text-blue-300 text-xs">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-blue-100 pt-2">
          {item.args !== undefined && (
            <div>
              <div className="text-blue-400 text-[10px] mb-1">Input</div>
              <pre className="whitespace-pre-wrap break-words text-blue-800">
                {JSON.stringify(item.args, null, 2)}
              </pre>
            </div>
          )}
          {done && (
            <div>
              <div className="text-green-500 text-[10px] mb-1">Output</div>
              <pre className="whitespace-pre-wrap break-words text-green-800">
                {typeof item.result === 'string'
                  ? item.result
                  : JSON.stringify(item.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function Chat() {
  const [items, setItems]     = useState<ConvItem[]>([]);
  const [input, setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);
  const sessionId  = useRef(uid());
  const bottomRef  = useRef<HTMLDivElement>(null);
  const apiUrl     = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setItems(prev => [...prev, { kind: 'user', id: uid(), text }]);
    setInput('');
    setStreaming(true);

    // mutable refs so closure always sees latest values
    const pendingTools: Record<string, string> = {};  // callId/name → item id
    let curTextId: string | null = null;

    const pushTextItem = () => {
      const id = uid();
      curTextId = id;
      setItems(prev => [...prev, { kind: 'text', id, text: '', streaming: true }]);
    };

    // Show loading dots immediately
    pushTextItem();

    try {
      const res = await fetch(`${apiUrl}/api/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId.current }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });

        let boundary: number;
        while ((boundary = buf.indexOf('\n\n')) !== -1) {
          const chunk = buf.slice(0, boundary);
          buf = buf.slice(boundary + 2);

          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let evt: ADKEvent;
            try { evt = JSON.parse(raw); } catch { continue; }

            if (evt.error) {
              setItems(prev => [...prev, { kind: 'text', id: uid(), text: `错误: ${evt.error}`, streaming: false }]);
              continue;
            }

            for (const part of evt.content?.parts ?? []) {
              if (part.thought) continue;   // skip thinking content

              // ── Text ──────────────────────────────────────────────────
              if (part.text) {
                if (!curTextId) pushTextItem();
                const tid = curTextId!;
                setItems(prev => prev.map(item =>
                  item.id === tid && item.kind === 'text'
                    ? { ...item, text: item.text + part.text }
                    : item
                ));
              }

              // ── Tool call ──────────────────────────────────────────────
              if (part.functionCall) {
                const fc = part.functionCall;
                const itemId = uid();
                const key = fc.id ?? fc.name;
                pendingTools[key] = itemId;
                curTextId = null;   // next text → new bubble
                setItems(prev => [...prev, {
                  kind: 'tool', id: itemId, callId: fc.id,
                  name: fc.name, args: fc.args,
                }]);
              }

              // ── Tool result ────────────────────────────────────────────
              if (part.functionResponse) {
                const fr = part.functionResponse;
                const key = fr.id ?? fr.name;
                const itemId = pendingTools[key];
                if (itemId) {
                  setItems(prev => prev.map(item =>
                    item.id === itemId && item.kind === 'tool'
                      ? { ...item, result: fr.response }
                      : item
                  ));
                }
              }
            }
          }
        }
      }
    } catch (err) {
      setItems(prev => [...prev, {
        kind: 'text', id: uid(), streaming: false,
        text: `连接失败: ${err instanceof Error ? err.message : String(err)}`,
      }]);
    } finally {
      if (curTextId) {
        const tid = curTextId;
        setItems(prev => prev.map(item =>
          item.id === tid && item.kind === 'text' ? { ...item, streaming: false } : item
        ));
      }
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center gap-2 shrink-0">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="font-semibold text-gray-700">AI Agent Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {items.length === 0 && (
          <div className="text-center text-gray-400 mt-20 text-sm">
            <div className="text-4xl mb-3">💬</div>
            <p>发送消息开始对话</p>
          </div>
        )}

        {items.map(item => {
          if (item.kind === 'user') return (
            <div key={item.id} className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-blue-500 text-white px-4 py-2.5 text-sm max-w-[75%] leading-relaxed">
                {item.text}
              </div>
            </div>
          );

          if (item.kind === 'tool') return (
            <div key={item.id} className="flex justify-start">
              <ToolBubble item={item} />
            </div>
          );

          // text bubble
          return (
            <div key={item.id} className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2.5 text-sm max-w-[85%] leading-relaxed text-gray-800 whitespace-pre-wrap">
                {item.text
                  ? <>
                      {item.text}
                      {item.streaming && (
                        <span className="inline-block w-0.5 h-3.5 bg-gray-500 ml-0.5 animate-pulse align-middle" />
                      )}
                    </>
                  : item.streaming && (
                      <span className="flex gap-1 text-gray-400">
                        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                      </span>
                    )
                }
              </div>
            </div>
          );
        })}

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
            disabled={streaming}
            style={{ minHeight: '42px', maxHeight: '160px' }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 160) + 'px';
            }}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white px-4 py-2.5 text-sm font-medium transition-colors shrink-0"
          >
            {streaming ? '…' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
