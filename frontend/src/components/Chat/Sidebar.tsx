import { useState } from 'react';

export interface Session {
  id: string;
  name: string;
  created_at: string;
}

interface SidebarProps {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function Sidebar({ sessions, activeId, onSelect, onCreate, onDelete, onRename }: SidebarProps) {
  const [open, setOpen]       = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName]   = useState('');

  const startEdit = (s: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditName(s.name);
  };

  const commitEdit = (id: string) => {
    if (editName.trim()) onRename(id, editName.trim());
    setEditingId(null);
  };

  const label: React.CSSProperties = {
    fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase',
    fontFamily: "'Manrope', sans-serif",
  };

  return (
    <>
      {/* Collapsed toggle */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{ position: 'fixed', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 20, background: '#efefef', border: '1px solid #d0d0d2', borderLeft: 'none', padding: '10px 4px', cursor: 'pointer', color: '#888', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#0A3A8A')}
          onMouseLeave={e => (e.currentTarget.style.color = '#888')}
        >
          <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Panel */}
      <div style={{
        display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh',
        background: '#efefef', borderRight: '1px solid #d0d0d2',
        width: open ? '220px' : '0', overflow: 'hidden', transition: 'width 0.2s ease',
        fontFamily: "'Manrope', sans-serif",
      }}>

        {/* Header */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid #d0d0d2', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...label, color: '#555', fontWeight: 600 }}>对话列表</span>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', lineHeight: 1, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#141414')}
            onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
          >
            <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* New session */}
        <div style={{ padding: '10px 12px', flexShrink: 0 }}>
          <button
            onClick={onCreate}
            style={{ width: '100%', background: 'none', border: '1px dashed #c0c0c2', cursor: 'pointer', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#aaa', transition: 'all 0.2s', fontFamily: "'Manrope', sans-serif' " }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0A3A8A'; e.currentTarget.style.color = '#0A3A8A'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#c0c0c2'; e.currentTarget.style.color = '#aaa'; }}
          >
            <svg style={{ width: '10px', height: '10px', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span style={{ ...label, color: 'inherit' }}>新建对话</span>
          </button>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px' }}>
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                cursor: 'pointer', borderLeft: s.id === activeId ? '2px solid #0A3A8A' : '2px solid transparent',
                background: s.id === activeId ? 'rgba(10,58,138,0.06)' : 'transparent',
                marginBottom: '2px', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (s.id !== activeId) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { if (s.id !== activeId) e.currentTarget.style.background = 'transparent'; }}
            >
              <svg style={{ width: '10px', height: '10px', flexShrink: 0, color: s.id === activeId ? '#0A3A8A' : '#aaa' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>

              {editingId === s.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => commitEdit(s.id)}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(s.id); if (e.key === 'Escape') setEditingId(null); }}
                  onClick={e => e.stopPropagation()}
                  style={{ flex: 1, background: '#e6e6e8', border: '1px solid #0A3A8A', outline: 'none', padding: '1px 6px', fontSize: '0.75rem', fontFamily: "'Manrope', sans-serif", color: '#141414' }}
                />
              ) : (
                <span style={{ flex: 1, fontSize: '0.75rem', color: s.id === activeId ? '#141414' : '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: s.id === activeId ? 500 : 400 }}>
                  {s.name}
                </span>
              )}

              <div style={{ display: 'flex', gap: '2px', flexShrink: 0, opacity: 0 }} className="session-actions">
                <button onClick={e => startEdit(s, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '2px', lineHeight: 1, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#0A3A8A')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
                >
                  <svg style={{ width: '10px', height: '10px' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={e => { e.stopPropagation(); onDelete(s.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '2px', lineHeight: 1, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#c0392b')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
                >
                  <svg style={{ width: '10px', height: '10px' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <p style={{ ...label, color: '#ccc', textAlign: 'center', padding: '24px 0' }}>暂无对话</p>
          )}
        </div>
      </div>

      <style>{`
        div:hover > .session-actions { opacity: 1 !important; }
      `}</style>
    </>
  );
}
