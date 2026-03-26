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
  const [open, setOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEdit = (s: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditName(s.name);
  };

  const commitEdit = (id: string) => {
    if (editName.trim()) onRename(id, editName.trim());
    setEditingId(null);
  };

  return (
    <>
      {/* Toggle button when collapsed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-slate-200 rounded-r-xl px-1.5 py-3 shadow-md text-slate-400 hover:text-violet-500 transition-colors"
          title="展开侧边栏"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Sidebar panel */}
      <div
        className={`flex flex-col shrink-0 h-screen bg-white border-r border-slate-200 transition-all duration-200 overflow-hidden ${
          open ? 'w-56' : 'w-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 shrink-0">
          <span className="text-sm font-semibold text-slate-700">对话列表</span>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-300 hover:text-slate-500 transition-colors"
            title="收起"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* New session button */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          <button
            onClick={onCreate}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50 text-xs font-medium transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新建对话
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                s.id === activeId
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0 opacity-50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>

              {editingId === s.id ? (
                <input
                  autoFocus
                  className="flex-1 text-xs bg-white border border-violet-300 rounded-lg px-2 py-0.5 outline-none text-slate-800"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => commitEdit(s.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit(s.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 text-xs font-medium truncate">{s.name}</span>
              )}

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={e => startEdit(s, e)}
                  className="p-0.5 rounded hover:text-violet-500 transition-colors"
                  title="重命名"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                  className="p-0.5 rounded hover:text-red-500 transition-colors"
                  title="删除"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <p className="text-center text-xs text-slate-300 py-6">暂无对话</p>
          )}
        </div>
      </div>
    </>
  );
}
