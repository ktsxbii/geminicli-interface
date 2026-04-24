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
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [isRecentsExpanded, setIsRecentsExpanded] = useState(true);
  const [activeModel, setActiveModel] = useState(MODELS[0]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isNearLogo, setIsNearLogo] = useState(false);
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

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isOverTitleBar = target && target.closest('.title-bar');

      const isProximityTriggered = 
        isSidebarCollapsed && 
        !isOverTitleBar &&
        e.clientX < 200 && 
        e.clientY > 40 && 
        e.clientY < 170;
      
      setIsNearLogo(isProximityTriggered);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      setContextMenu(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarCollapsed]);

  const handleNewChat = async () => {
    // Let backend create a real session
    await (window as any).electronAPI.sessions.list(); 
    setMessages([]);
    setInputAssets([]);
    if (inputRef.current) inputRef.current.innerText = '';
    refreshSessions();
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

  const handleAddProject = () => {
    const name = prompt("Enter project name:");
    if (name) {
      setProjects(prev => [...prev, { id: Date.now().toString(), name }]);
    }
  };

  const handleSidebarContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sessionId });
  };

  const handleRenameSession = async (id: string) => {
    setContextMenu(null);
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

  const handleDeleteSession = async (id: string) => {
    setContextMenu(null);
    await (window as any).electronAPI.sessions.delete(id);
    setShowDeleteConfirm(null);
    refreshSessions();
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

  const getModelMenuStyles = () => {
    if (!modelDropdownRef.current) return {};
    const rect = modelDropdownRef.current.getBoundingClientRect();
    const menuWidth = 240;
    let left = rect.left;
    
    if (left + menuWidth > window.innerWidth - 16) {
      left = window.innerWidth - menuWidth - 16;
    }
    
    left = Math.max(16, left);

    return {
      position: 'fixed' as const,
      left: left + 'px',
      bottom: (window.innerHeight - rect.top + 8) + 'px',
      zIndex: 9999,
      minWidth: menuWidth + 'px'
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
               {/* 1. Static Brand Logo */}
               <div className={`gemini-logo-static ${isSidebarCollapsed ? "hidden" : ""}`}>
                 <div className="btn-icon-box">
                   <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
                   </svg>
                 </div>
               </div>

               <button 
                 className={`collapse-btn anchored ${!isSidebarCollapsed ? "hidden" : ""} ${isNearLogo ? "hover-proximity" : ""}`} 
                 onClick={() => setIsSidebarCollapsed(false)}
                 title="Expand sidebar"
               >
                 <div className="btn-icon-box">
                   <div className="icon-wrapper">
                     <svg className="gemini-logo-inner" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
                     </svg>
                     <svg className="expand-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                       <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                       <line x1="9" y1="3" x2="9" y2="21" />
                     </svg>
                   </div>
                 </div>
               </button>

               <button 
                 className={`collapse-btn floating-trigger ${isSidebarCollapsed ? "hidden" : ""}`} 
                 onClick={() => setIsSidebarCollapsed(true)}
                 title="Collapse sidebar"
               >
                 <div className="btn-icon-box">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                     <line x1="9" y1="3" x2="9" y2="21" />
                   </svg>
                 </div>
               </button>
            </div>
            
            <div className="sidebar-group primary-actions" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '12px' }}>
               <button className="sidebar-btn new-chat-btn" onClick={handleNewChat}>
                 <div className="btn-icon-box">
                   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                     <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                   </svg>
                 </div>
                 <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--white)', letterSpacing: '0.05em', fontFamily: 'var(--font-sidebar)' }}>New chat</span>
               </button>

               <button className={`sidebar-btn terminal-btn ${isTerminalOpen ? 'active' : ''}`} onClick={() => setIsTerminalOpen(!isTerminalOpen)}>
                 <div className="btn-icon-box">
                   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
                     <path d="M7 8l3 3-3 3" />
                     <line x1="12" y1="14" x2="17" y2="14" />
                   </svg>
                 </div>
                 <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--white)', letterSpacing: '0.05em', fontFamily: 'var(--font-sidebar)', display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'space-between', paddingRight: '12px' }}>
                   Terminal
                   <svg className="hover-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--gray-600)', opacity: 0, transition: 'opacity 0.2s ease, transform 0.2s ease', transform: 'translate(-4px, 4px)' }}>
                     <line x1="5" y1="19" x2="19" y2="5" /><polyline points="12 5 19 5 19 12" />
                   </svg>
                 </span>
               </button>

               <button className="sidebar-btn more-btn" onClick={() => {}}>
                 <div className="btn-icon-box">
                   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                     <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                   </svg>
                 </div>
                 <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--white)', letterSpacing: '0.05em', fontFamily: 'var(--font-sidebar)' }}>More</span>
               </button>
            </div>


            <div className="sidebar-scroll">
              {!isSidebarCollapsed && (
                <section className="sidebar-section fade-in-on-expand">
                  <div className="section-header-row" onClick={() => setIsProjectsExpanded(!isProjectsExpanded)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '0' }}>
                    <h3>Projects</h3>
                    <svg 
                      className={`section-chevron ${isProjectsExpanded ? 'expanded' : ''}`}
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                      style={{ transition: 'transform 0.2s ease', transform: isProjectsExpanded ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--text-tertiary)' }}
                    >
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                  <div className={`sidebar-list accordion-content ${isProjectsExpanded ? 'expanded' : 'collapsed'}`}>
                    <button className="sidebar-btn" onClick={handleAddProject}>
                      <div className="btn-icon-box">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M22 13V9C22 7.89543 21.1046 7 20 7H11.5L9.5 5H4C2.89543 5 2 5.89543 2 7V19C2 20.1046 2.89543 21 4 21H13" />
                          <line x1="18" x2="18" y1="15" y2="23" />
                          <line x1="14" x2="22" y1="19" y2="19" />
                        </svg>
                      </div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 400, letterSpacing: '0.05em', color: 'var(--white)', fontFamily: 'var(--font-sidebar)' }}>New Project</span>
                    </button>
                    {projects.map(p => (
                      <div key={p.id} className="sidebar-btn">
                        <div className="btn-icon-box">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 400, letterSpacing: '0.05em', color: 'var(--white)', fontFamily: 'var(--font-sidebar)' }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="sidebar-section">
                <div className="section-header-row" onClick={() => setIsRecentsExpanded(!isRecentsExpanded)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '0' }}>
                  <h3>Recents</h3>
                  <svg 
                    className={`section-chevron ${isRecentsExpanded ? 'expanded' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                    style={{ transition: 'transform 0.2s ease', transform: isRecentsExpanded ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--text-tertiary)' }}
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
                <div className={`sidebar-list accordion-content ${isRecentsExpanded ? 'expanded' : 'collapsed'}`}>
                  {sessions.length === 0 ? (
                    <div className="placeholder">No recent chats</div>
                  ) : (
                    sessions.map(s => (
                      <div key={s.id} className="list-item session-item" onContextMenu={(e) => handleSidebarContextMenu(e, s.id)}>
                        <span className="session-name">{s.name}</span>
                        <button className="session-more-btn" onClick={(e) => { e.stopPropagation(); handleSidebarContextMenu(e, s.id); }} title="Options">
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                             <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                           </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <footer className="sidebar-footer">
              <button ref={userBtnRef} className="sidebar-btn user-profile-btn" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                <div className="btn-icon-box">
                  <div className="avatar">JD</div>
                </div>
                <span>John Doe</span>
              </button>
            </footer>
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
                      <div className="popover-menu" style={getModelMenuStyles()}>
                        {MODELS.map(model => (
                          <div key={model.id} className="menu-item" onClick={() => { setActiveModel(model); setIsModelDropdownOpen(false); }}>
                            <div style={{flex: 1}}>{model.name}</div>
                            {activeModel.id === model.id && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
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

      {isUserMenuOpen && (
        <div className="popover-menu" style={getUserMenuStyles()} ref={userMenuRef}>
          <div className="menu-item" onClick={() => setIsUserMenuOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile
          </div>
          <div className="menu-item" onClick={() => setIsUserMenuOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Settings
          </div>
          <div className="menu-item" onClick={() => setIsUserMenuOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Help
          </div>
          <div className="menu-separator" style={{height: '1px', background: 'var(--border-subtle)', margin: '4px 0'}} />
          <div className="menu-item" onClick={() => setIsUserMenuOpen(false)} style={{color: '#ff4d4d'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </div>
        </div>
      )}

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
