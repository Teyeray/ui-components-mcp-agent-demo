import { useState, useRef, useEffect, useCallback } from 'react';
import { Sidebar, Session } from './Sidebar';

// ── Types ──────────────────────────────────────────────────────────────────

type ConvItem =
  | { kind: 'user';  id: string; text: string }
  | { kind: 'text';  id: string; text: string; streaming: boolean }
  | { kind: 'tool';  id: string; name: string; args?: Record<string, unknown>; result?: unknown; callId?: string };

interface ADKPart {
  text?: string;
  thought?: boolean;
  functionCall?:     { name: string; args?: Record<string, unknown>; id?: string };
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 text-xs font-mono w-fit max-w-[85%] overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-4 py-2.5 w-full text-left"
      >
        <span className={`text-slate-400 text-base ${!done ? 'animate-spin' : ''}`}
              style={done ? {} : { animationDuration: '2s' }}>
          ⚙
        </span>
        <span className="font-sans font-medium text-slate-600 text-[13px] tracking-tight">{item.name}</span>
        {done
          ? <span className="ml-0.5 text-emerald-500 text-xs font-sans">✓</span>
          : <span className="ml-0.5 text-amber-400 text-xs font-sans animate-pulse">running</span>}
        <span className="ml-auto text-slate-300 font-sans text-xs">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-200 bg-white divide-y divide-slate-100">
          {item.args !== undefined && (
            <div className="px-4 py-3">
              <div className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Input</div>
              <pre className="whitespace-pre-wrap break-words text-slate-700 leading-relaxed">
                {JSON.stringify(item.args, null, 2)}
              </pre>
            </div>
          )}
          {done && (
            <div className="px-4 py-3">
              <div className="text-[10px] font-sans font-semibold text-emerald-500 uppercase tracking-widest mb-1.5">Output</div>
              <pre className="whitespace-pre-wrap break-words text-slate-700 leading-relaxed">
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

// ── Avatar ─────────────────────────────────────────────────────────────────

function Avatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
      <span className="text-white text-xs font-bold">AI</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface ChatProps {
  token: string;
  username: string;
  onLogout: () => void;
}

export function Chat({ token, username, onLogout }: ChatProps) {
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [items, setItems]         = useState<ConvItem[]>([]);
  const [input, setInput]         = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const readerRef    = useRef<ReadableStreamDefaultReader | null>(null);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const apiFetch = useCallback(async (input: string, init?: RequestInit) => {
    const res = await fetch(input, { ...init, headers: { ...authHeaders, ...init?.headers } });
    if (res.status === 401) { onLogout(); throw new Error('Unauthorized'); }
    return res;
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  // ── Session management ─────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    const res = await apiFetch(`${apiUrl}/api/sessions`).catch(() => null);
    if (!res) return [];
    const data: Session[] = await res.json();
    setSessions(data);
    return data;
  }, [apiUrl, apiFetch]);

  useEffect(() => {
    loadSessions().then(data => {
      if (data.length > 0) switchSession(data[data.length - 1].id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createSession = async () => {
    const res = await apiFetch(`${apiUrl}/api/sessions`, { method: 'POST', body: JSON.stringify({}) });
    const s: Session = await res.json();
    setSessions(prev => [...prev, s]);
    switchSession(s.id);
  };

  const deleteSession = async (id: string) => {
    await apiFetch(`${apiUrl}/api/sessions/${id}`, { method: 'DELETE' }).catch(() => null);
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (activeId === id) {
        if (next.length > 0) switchSession(next[next.length - 1].id);
        else { setActiveId(null); setItems([]); }
      }
      return next;
    });
  };

  const renameSession = async (id: string, name: string) => {
    await apiFetch(`${apiUrl}/api/sessions/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }).catch(() => null);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const switchSession = async (id: string) => {
    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch { /* ignore */ }
      readerRef.current = null;
    }
    setStreaming(false);
    setActiveId(id);
    const res = await apiFetch(`${apiUrl}/api/sessions/${id}/history`).catch(() => null);
    if (!res) return;
    const history: { role: string; content: string }[] = await res.json();
    setItems(history.map(h => ({
      kind: h.role === 'user' ? 'user' : 'text',
      id: uid(),
      text: h.content,
      streaming: false,
    } as ConvItem)));
  };

  // ── Send message ───────────────────────────────────────────────────────

  const send = async () => {
    const text = input.trim();
    if (!text || streaming || !activeId) return;

    setItems(prev => [...prev, { kind: 'user', id: uid(), text }]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '42px';
    setStreaming(true);

    const pendingTools: Record<string, string> = {};
    let curTextId: string | null = null;

    const pushTextItem = () => {
      const id = uid();
      curTextId = id;
      setItems(prev => [...prev, { kind: 'text', id, text: '', streaming: true }]);
    };
    pushTextItem();

    try {
      // Single POST request: saves message, subscribes to Redis, starts agent, streams events.
      const res = await apiFetch(`${apiUrl}/api/sessions/${activeId}/stream`, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      readerRef.current = reader;
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

            let envelope: { type: string; data?: ADKEvent; message?: string };
            try { envelope = JSON.parse(raw); } catch { continue; }

            if (envelope.type === 'done') {
              reader.cancel();
              break;
            }

            if (envelope.type === 'error') {
              setItems(prev => [...prev, { kind: 'text', id: uid(), text: `错误: ${envelope.message}`, streaming: false }]);
              continue;
            }

            const evt = envelope.data;
            if (!evt) continue;

            if (evt.error) {
              setItems(prev => [...prev, { kind: 'text', id: uid(), text: `错误: ${evt.error}`, streaming: false }]);
              continue;
            }

            for (const part of evt.content?.parts ?? []) {
              if (part.thought) continue;

              if (part.text) {
                if (!curTextId) pushTextItem();
                const tid = curTextId!;
                setItems(prev => prev.map(item =>
                  item.id === tid && item.kind === 'text'
                    ? { ...item, text: item.text + part.text }
                    : item
                ));
              }

              if (part.functionCall) {
                const fc = part.functionCall;
                const itemId = uid();
                pendingTools[fc.id ?? fc.name] = itemId;
                curTextId = null;
                setItems(prev => [...prev, {
                  kind: 'tool', id: itemId, callId: fc.id,
                  name: fc.name, args: fc.args,
                }]);
              }

              if (part.functionResponse) {
                const fr = part.functionResponse;
                const itemId = pendingTools[fr.id ?? fr.name];
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
      readerRef.current = null;
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
    <div className="flex h-screen bg-slate-50">

      {/* ── Sidebar ── */}
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={switchSession}
        onCreate={createSession}
        onDelete={deleteSession}
        onRename={renameSession}
      />

      {/* ── Chat area ── */}
      <div className="flex flex-col flex-1 min-w-0 h-screen">

        {/* ── Header ── */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-sm leading-none">
              {sessions.find(s => s.id === activeId)?.name || 'Agent Chat'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">由 MCP 工具驱动</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              在线
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
              <span className="font-medium">{username}</span>
            </div>
            <button
              onClick={onLogout}
              className="text-[11px] text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
              title="退出登录"
            >
              退出
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">

          {!activeId && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 select-none">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-3xl shadow-inner">
                💬
              </div>
              <p className="text-sm font-medium text-slate-500">选择或新建一个对话</p>
            </div>
          )}

          {activeId && items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 select-none">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-3xl shadow-inner">
                💬
              </div>
              <p className="text-sm font-medium text-slate-500">发送消息开始对话</p>
              <p className="text-xs text-slate-400">支持工具调用，结果实时流式返回</p>
            </div>
          )}

          {items.map(item => {

            /* user */
            if (item.kind === 'user') return (
              <div key={item.id} className="flex justify-end gap-2 items-end">
                <div className="rounded-2xl rounded-br-sm bg-gradient-to-br from-violet-500 to-indigo-600 text-white px-4 py-3 text-sm max-w-[72%] leading-relaxed shadow-sm">
                  {item.text}
                </div>
              </div>
            );

            /* tool */
            if (item.kind === 'tool') return (
              <div key={item.id} className="flex justify-start gap-2 items-start">
                <Avatar />
                <ToolBubble item={item} />
              </div>
            );

            /* assistant text */
            return (
              <div key={item.id} className="flex justify-start gap-2 items-start">
                <Avatar />
                <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-4 py-3 text-sm max-w-[80%] leading-relaxed text-slate-800 whitespace-pre-wrap shadow-sm">
                  {item.text
                    ? <>
                        {item.text}
                        {item.streaming && (
                          <span className="inline-block w-0.5 h-[1em] bg-violet-400 ml-0.5 align-middle animate-pulse rounded-full" />
                        )}
                      </>
                    : item.streaming && (
                        <span className="flex gap-1 items-center h-4">
                          {[0, 150, 300].map(delay => (
                            <span
                              key={delay}
                              className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                              style={{ animationDelay: `${delay}ms` }}
                            />
                          ))}
                        </span>
                      )
                  }
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 transition-all leading-relaxed placeholder:text-slate-400 disabled:opacity-50"
                rows={1}
                placeholder={activeId ? "输入消息… (Enter 发送，Shift+Enter 换行)" : "请先选择或新建一个对话"}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming || !activeId}
                style={{ minHeight: '46px', maxHeight: '160px' }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 160) + 'px';
                }}
              />
            </div>
            <button
              onClick={send}
              disabled={streaming || !input.trim() || !activeId}
              className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:from-slate-200 disabled:to-slate-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shadow-sm hover:shadow active:scale-95"
            >
              {streaming
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5" />
                  </svg>
              }
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-300 mt-2">Enter 发送 · Shift+Enter 换行</p>
        </div>

      </div>
    </div>
  );
}
