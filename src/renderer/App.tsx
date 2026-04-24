import React, { useState, useEffect, useRef } from 'react';
import Terminal from './components/Terminal';

interface SessionMetadata {
  id: string;
  name: string;
  createdAt: number;
  lastActive: number;
  project?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

const MODELS = [
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' },
];

const App: React.FC = () => {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeModel, setActiveModel] = useState(MODELS[0]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [inputAssets, setInputAssets] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, sessionId: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const refreshSessions = async () => {
    const list = await (window as any).electronAPI.sessions.list();
    setSessions(list);
  };

  useEffect(() => {
    refreshSessions();

    (window as any).electronAPI.files.onUpdate((files: string[]) => {
      const newImages = files
        .filter(f => f.match(/\.(jpg|jpeg|png|gif|webp)$/i))
        .map(f => f.startsWith('blob:') ? f : `file://${f}`);
      setInputAssets(prev => Array.from(new Set([...prev, ...newImages])));
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      setContextMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    setInputAssets([]);
    if (inputRef.current) inputRef.current.innerText = '';
  };

  const handleSendMessage = () => {
    const text = inputRef.current?.innerText.trim();
    if (!text && inputAssets.length === 0) return;

    const newMessage: Message = {
      role: 'user',
      content: text || '',
      images: [...inputAssets],
    };

    setMessages(prev => [...prev, newMessage]);
    (window as any).electronAPI.terminal.sendData(`${text || "Analyze assets"}\n`);

    if (inputRef.current) inputRef.current.innerText = '';
    setInputAssets([]);
  };

  const handleSidebarContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sessionId });
  };

  const handleDeleteSession = async (id: string) => {
    await (window as any).electronAPI.sessions.delete(id);
    setShowDeleteConfirm(null);
    refreshSessions();
  };

  const handleRenameSession = async (id: string) => {
    const newName = prompt("Enter new name:");
    if (newName) {
      await (window as any).electronAPI.sessions.rename(id, newName);
      refreshSessions();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    let hasImage = false;
    items.forEach(item => {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault();
        hasImage = true;
        const file = item.getAsFile();
        if (file) {
          const url = URL.createObjectURL(file);
          setInputAssets(prev => [...prev, url]);
        }
      }
    });
  };

  const getUserMenuStyles = () => {
    if (!userBtnRef.current) return {};
    const rect = userBtnRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      left: '12px',
      bottom: (window.innerHeight - rect.top + 8) + 'px',
      zIndex: 9999
    };
  };

  return (
    <div className="container" onDrop={(e) => e.preventDefault()} onDragOver={(e) => e.preventDefault()}>
      {/* TITLE BAR */}
      <nav className="title-bar">
        <div className="title-bar-left">
          <button className="title-btn" title="Back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button className="title-btn" title="Forward">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div className="title-bar-center">Gemini</div>
        <div className="title-bar-right">
          <button className={`title-btn terminal-btn ${isTerminalOpen ? 'active' : ''}`} onClick={() => setIsTerminalOpen(!isTerminalOpen)} title="Toggle Terminal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>
          </button>
          <div className="title-separator" />
          <button className="title-btn window-control" onClick={() => (window as any).electronAPI.window.minimize()}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <button className="title-btn window-control" onClick={() => (window as any).electronAPI.window.maximize()}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="5" width="14" height="14" rx="2" ry="2"/></svg></button>
          <button className="title-btn window-control close-btn" onClick={() => (window as any).electronAPI.window.close()}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
      </nav>

      <div className="app-layout">
        {/* SIDEBAR */}
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-content">
            <div className="sidebar-row collapse-container">
               <button className="collapse-btn anchored" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                 <div className="btn-icon-box">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                     <line x1="9" y1="3" x2="9" y2="21" />
                   </svg>
                 </div>
               </button>
               <button className="collapse-btn floating" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                 <div className="btn-icon-box">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                     <line x1="9" y1="3" x2="9" y2="21" />
                   </svg>
                 </div>
               </button>
            </div>
            
            <div className="sidebar-row">
               <button className="sidebar-btn new-chat-btn" onClick={handleNewChat}>
                 <div className="btn-icon-box">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                     <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                   </svg>
                 </div>
                 <span>New chat</span>
               </button>
            </div>

            <div className="sidebar-scroll">
              <section className="sidebar-section">
                <h3>Recents</h3>
                <div className="sidebar-list">
                  <div className="placeholder" style={{paddingLeft: '60px', opacity: 0.5, fontSize: '0.8rem'}}>No recent chats</div>
                </div>
              </section>

              <section className="sidebar-section">
                <h3>Pins</h3>
                <div className="sidebar-list">
                  <div className="placeholder" style={{paddingLeft: '60px', opacity: 0.5, fontSize: '0.8rem'}}>No pinned items</div>
                </div>
              </section>

              <section className="sidebar-section">
                <h3>History</h3>
                <div className="sidebar-list">
                  {sessions.length === 0 ? (
                    <div className="placeholder" style={{paddingLeft: '60px', opacity: 0.5, fontSize: '0.8rem'}}>No history yet</div>
                  ) : (
                    sessions.map(s => (
                      <div key={s.id} className="list-item" onContextMenu={(e) => handleSidebarContextMenu(e, s.id)}>
                        <span>{s.name || s.project || 'Untitled Chat'}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <footer className="sidebar-footer">
              <button className="sidebar-btn" onClick={() => {}}>
                <div className="btn-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </div>
                <span>Settings</span>
              </button>
              <button className="sidebar-btn" onClick={() => {}} style={{color: '#ff4d4d'}}>
                <div className="btn-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>
                <span>Logout</span>
              </button>
              <button ref={userBtnRef} className="sidebar-btn user-profile-btn" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                <div className="btn-icon-box">
                  <div className="avatar">JD</div>
                </div>
                <span>John Doe</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <div className="chat-pane">
            <div className="messages">
              {messages.length === 0 ? (
                <div className="welcome-screen">
                  <h1 className="welcome-title">Gemini</h1>
                  <p className="welcome-subtitle">The high-fidelity AI desktop experience.</p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <article key={i} className={`message ${m.role}`}>
                    <div className="message-content">
                      {m.images?.map(img => (<img key={img} src={img} className="message-image" alt="upload" />))}
                      <p>{m.content}</p>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="input-area">
              <div className="input-container">
                {inputAssets.length > 0 && (
                  <div className="image-preview-container">
                    {inputAssets.map(asset => (
                      <div key={asset} className="inline-image-preview">
                        <img src={asset} alt="preview" />
                        <button className="remove-img-btn" onClick={() => setInputAssets(prev => prev.filter(a => a !== asset))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="input-flex-row">
                  <button className="plus-btn" onClick={async () => await (window as any).electronAPI.files.pickFiles()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <div ref={inputRef} className="content-editable" contentEditable data-placeholder="Ask anything..." onPaste={handlePaste} onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                    if (e.key === 'Backspace' && !inputRef.current?.innerText.trim() && inputAssets.length > 0) { setInputAssets(prev => prev.slice(0, -1)); }
                  }} />
                  <div className="model-selector" ref={modelDropdownRef}>
                    <button className="model-person-btn" onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </button>
                    {isModelDropdownOpen && (
                      <div className="dropdown-menu model-popover">
                        {MODELS.map(model => (
                          <div key={model.id} className="dropdown-item" onClick={() => { setActiveModel(model); setIsModelDropdownOpen(false); }}>
                            {model.name}
                            {activeModel.id === model.id && <span className="check-icon">✓</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="send-btn" onClick={handleSendMessage} disabled={!inputRef.current?.innerText.trim() && inputAssets.length === 0}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isTerminalOpen && (
            <div className="terminal-pane">
              <header className="terminal-header"><span>Terminal — Gemini CLI</span><button className="title-btn" onClick={() => setIsTerminalOpen(false)}>✕</button></header>
              <Terminal />
            </div>
          )}
        </main>
      </div>

      {contextMenu && (
        <div className="popover-menu" style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}>
          <div className="menu-item" onClick={() => handleRenameSession(contextMenu.sessionId)}>✏️ Rename</div>
          <div className="menu-item" style={{color: '#ff4d4d'}} onClick={() => setShowDeleteConfirm(contextMenu.sessionId)}>🗑️ Delete</div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{marginTop: 0, fontSize: '1.25rem'}}>Delete Chat?</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem'}}>This action will permanently remove the chat history and associated context assets.</p>
            <div style={{display: 'flex', gap: '12px'}}>
              <button className="new-chat-btn" style={{flex: 1}} onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="send-btn" style={{background: '#ff4d4d', color: '#fff', borderRadius: '12px', flex: 1, height: '40px', fontWeight: 600}} onClick={() => handleDeleteSession(showDeleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;