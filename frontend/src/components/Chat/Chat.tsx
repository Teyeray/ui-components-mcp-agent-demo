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

function autoSessionName(text: string): string {
  const s = text.trim().replace(/\s+/g, ' ');
  if (s.length <= 20) return s;
  const cut = s.slice(0, 20);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 8 ? cut.slice(0, lastSpace) : cut) + '…';
}

// ── Tool bubble ────────────────────────────────────────────────────────────

function ToolBubble({ item }: { item: Extract<ConvItem, { kind: 'tool' }> }) {
  const [open, setOpen] = useState(false);
  const done = item.result !== undefined;

  return (
    <div style={{ border: '1px solid #d0d0d2', background: '#ebebed', fontFamily: "'Manrope', sans-serif" }} className="text-xs w-fit max-w-[85%] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-4 py-2.5 w-full text-left"
        style={{ color: '#555' }}
      >
        <span className={!done ? 'animate-spin' : ''} style={{ color: '#0A3A8A', fontSize: '0.9rem', ...(done ? {} : { animationDuration: '2s' }) }}>⚙</span>
        <span style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#141414', fontWeight: 500 }}>{item.name}</span>
        {done
          ? <span style={{ color: '#0A3A8A', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>done</span>
          : <span style={{ color: '#888', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }} className="animate-pulse">running</span>}
        <span style={{ marginLeft: 'auto', color: '#aaa', fontSize: '0.65rem' }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #d0d0d2', background: '#f5f5f6' }}>
          {item.args !== undefined && (
            <div className="px-4 py-3">
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>Input</div>
              <pre className="whitespace-pre-wrap break-words leading-relaxed" style={{ color: '#333', fontSize: '0.72rem' }}>
                {JSON.stringify(item.args, null, 2)}
              </pre>
            </div>
          )}
          {done && (
            <div className="px-4 py-3" style={{ borderTop: '1px solid #d0d0d2' }}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#0A3A8A', marginBottom: '6px' }}>Output</div>
              <pre className="whitespace-pre-wrap break-words leading-relaxed" style={{ color: '#333', fontSize: '0.72rem' }}>
                {typeof item.result === 'string' ? item.result : JSON.stringify(item.result, null, 2)}
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
    <div style={{ width: '28px', height: '28px', background: '#0A3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: '#e6e6e8', fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.05em', fontFamily: "'Manrope', sans-serif" }}>AI</span>
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

    const isFirstMessage = items.length === 0;
    setItems(prev => [...prev, { kind: 'user', id: uid(), text }]);

    if (isFirstMessage) {
      renameSession(activeId, autoSessionName(text));
    }
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

  const S = {
    root:    { display: 'flex', height: '100vh', background: '#e6e6e8', fontFamily: "'Manrope', sans-serif" } as React.CSSProperties,
    area:    { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100vh' } as React.CSSProperties,
    header:  { flexShrink: 0, borderBottom: '1px solid #d0d0d2', background: '#efefef', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px' } as React.CSSProperties,
    msgs:    { flex: 1, overflowY: 'auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' } as React.CSSProperties,
    footer:  { flexShrink: 0, borderTop: '1px solid #d0d0d2', background: '#efefef', padding: '16px 24px' } as React.CSSProperties,
  };

  return (
    <div style={S.root}>

      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={switchSession}
        onCreate={createSession}
        onDelete={deleteSession}
        onRename={renameSession}
      />

      <div style={S.area}>

        {/* Header */}
        <div style={S.header}>
          <div style={{ width: '28px', height: '28px', background: '#0A3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#e6e6e8', fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>AI</span>
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.05rem', fontWeight: 600, color: '#141414', lineHeight: 1 }}>
              {sessions.find(s => s.id === activeId)?.name || 'Agent Chat'}
            </div>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', marginTop: '2px' }}>MCP · 工具驱动</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0A3A8A' }}>
              <span style={{ width: '5px', height: '5px', background: '#0A3A8A', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              Online
            </div>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>{username}</span>
            <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#141414')}
              onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
            >退出</button>
          </div>
        </div>

        {/* Messages */}
        <div style={S.msgs}>

          {!activeId && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', userSelect: 'none' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.5rem', fontWeight: 300, fontStyle: 'italic', color: '#bbb', letterSpacing: '-0.02em' }}>选择对话</div>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb' }}>或在左侧新建</div>
            </div>
          )}

          {activeId && items.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', userSelect: 'none' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.5rem', fontWeight: 300, fontStyle: 'italic', color: '#bbb', letterSpacing: '-0.02em' }}>开始对话</div>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb' }}>支持工具调用 · 实时流式</div>
            </div>
          )}

          {items.map(item => {

            /* user */
            if (item.kind === 'user') return (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#0A3A8A', color: '#e6e6e8', padding: '10px 16px', fontSize: '0.875rem', maxWidth: '72%', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {item.text}
                </div>
              </div>
            );

            /* tool */
            if (item.kind === 'tool') return (
              <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Avatar />
                <ToolBubble item={item} />
              </div>
            );

            /* assistant text */
            return (
              <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Avatar />
                <div style={{ background: '#f5f5f6', border: '1px solid #d0d0d2', padding: '10px 16px', fontSize: '0.875rem', maxWidth: '80%', lineHeight: 1.7, color: '#141414', whiteSpace: 'pre-wrap' }}>
                  {item.text
                    ? <>{item.text}{item.streaming && <span style={{ display: 'inline-block', width: '1px', height: '1em', background: '#0A3A8A', marginLeft: '2px', verticalAlign: 'middle', animation: 'cursor-blink 1s step-end infinite' }} />}</>
                    : item.streaming && (
                        <span style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '16px' }}>
                          {[0, 150, 300].map(d => <span key={d} style={{ width: '4px', height: '4px', background: '#aaa', borderRadius: '50%', animation: `bounce 1s ${d}ms infinite` }} />)}
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
        <div style={S.footer}>
          <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={activeId ? "输入消息…" : "请先选择或新建一个对话"}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming || !activeId}
              style={{ flex: 1, resize: 'none', background: '#e6e6e8', border: '1px solid #d0d0d2', borderRadius: 0, padding: '10px 14px', fontSize: '0.875rem', fontFamily: "'Manrope', sans-serif", outline: 'none', lineHeight: 1.6, color: '#141414', minHeight: '44px', maxHeight: '160px', transition: 'border-color 0.2s' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#0A3A8A')}
              onBlur={e => (e.currentTarget.style.borderColor = '#d0d0d2')}
              onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 160) + 'px'; }}
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim() || !activeId}
              style={{ flexShrink: 0, width: '44px', height: '44px', background: streaming || !input.trim() || !activeId ? '#d0d0d2' : '#141414', border: 'none', cursor: streaming || !input.trim() || !activeId ? 'not-allowed' : 'pointer', color: '#e6e6e8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            >
              {streaming
                ? <span style={{ width: '14px', height: '14px', border: '1px solid #e6e6e8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                : <svg style={{ width: '14px', height: '14px', transform: 'rotate(90deg)' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5" />
                  </svg>
              }
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginTop: '8px' }}>Enter 发送 · Shift+Enter 换行</p>
        </div>

      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
    </div>
  );
}
