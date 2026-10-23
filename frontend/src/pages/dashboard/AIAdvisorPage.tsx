import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, ArrowRight, Paperclip, RefreshCw, MessageSquarePlus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen, PanelLeft, Edit2, Check, X } from 'lucide-react';
import '../../styles/ai-advisor.css';
import { useAIAdvisor } from '../../features/ai-advisor/hooks/useAIAdvisor';

export const AIAdvisorPage: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    messages,
    isSending,
    isLoadingConversations,
    isLoadingMessages,
    error,
    sendMessage,
    loadConversation,
    startNewConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    clearError
  } = useAIAdvisor();

  const [inputValue, setInputValue] = useState('');
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(() => localStorage.getItem('finwise_ai_history_collapsed') === 'true');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleHistory = () => {
    const newState = !isHistoryCollapsed;
    setIsHistoryCollapsed(newState);
    localStorage.setItem('finwise_ai_history_collapsed', String(newState));
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = () => {
    if (!inputValue.trim() || isSending) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Future: handle actual file upload
      const text = `Uploaded file: ${file.name}`;
      sendMessage(text);
    }
  };

  return (
    <div className="ai-advisor-page">
      
      {/* 1. Ambient Background Layer */}
      <div className="ai-ambient-layer">
        <div className="ai-ambient-glow" />
        {/* Subtle Financial Background Lines (SVG) */}
        <svg style={{ position: 'absolute', top: '10%', left: 0, width: '150%', height: '400px' }}>
          <path className="financial-graph-line" d="M0,200 Q200,150 400,250 T800,200 T1200,300" style={{ animationDelay: '0s' }} />
          <path className="financial-graph-line" d="M0,250 Q300,350 500,150 T1000,250 T1400,150" style={{ animationDelay: '-5s', opacity: 0.04 }} />
        </svg>
        
        {/* Floating Fragments */}
        <div className="floating-fragment" style={{ top: '25%', left: '15%', animationDelay: '0s' }}>+₹6,000 savings</div>
        <div className="floating-fragment" style={{ top: '45%', right: '20%', animationDelay: '-3s' }}>↑ 12.4% growth</div>
        <div className="floating-fragment" style={{ top: '65%', left: '10%', animationDelay: '-6s' }}>₹54,200 expenses</div>
        <div className="floating-fragment" style={{ top: '35%', right: '35%', animationDelay: '-9s', fontSize: '0.65rem' }}>ON TRACK</div>
      </div>

      {/* 2. Floating AI Core */}
      <div className="ai-core-container">
        <div className="orbit-circle orbit-1" />
        <div className="orbit-circle orbit-2" />
        <div className="orbit-circle orbit-3" />
        <div className="core-pulse" />
        {/* Small floating data points around core */}
        <div style={{ position: 'absolute', top: 0, left: '50%', width: '4px', height: '4px', background: '#fff', borderRadius: '50%', transform: 'translate(-50%, -50%)', opacity: 0.5 }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: '3px', height: '3px', background: 'rgba(220,190,140,0.8)', borderRadius: '50%', opacity: 0.8 }} />
      </div>

      {/* 3. Main Content Sections */}
      
      {/* SECTION 1: FULL PAGE CHAT WITH SIDEBAR */}
      <section className="ai-section" style={{ maxWidth: '100%', padding: '8px 24px', height: 'calc(100vh - 80px)', display: 'flex', gap: '24px' }}>
        
        {/* Chat History Sidebar */}
        <div className={`ai-history-sidebar ${isHistoryCollapsed ? 'collapsed' : ''}`} style={{ 
          width: isHistoryCollapsed ? '64px' : '280px', 
          display: 'flex', 
          flexDirection: 'column', 
          borderRadius: '24px', 
          border: '1px solid rgba(220, 190, 140, 0.15)', 
          background: 'rgba(5, 5, 5, 0.6)',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          flexShrink: 0
        }}>
          <div style={{ padding: isHistoryCollapsed ? '20px 0' : '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'center' }}>
            {!isHistoryCollapsed && (
              <button 
                onClick={startNewConversation}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(220, 190, 140, 0.1)',
                  border: '1px solid rgba(220, 190, 140, 0.3)',
                  color: 'var(--accent-gold)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(220, 190, 140, 0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(220, 190, 140, 0.1)'}
              >
                <MessageSquarePlus size={18} />
                New Chat
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: isHistoryCollapsed ? '12px 0' : '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isHistoryCollapsed && (
              <button 
                onClick={startNewConversation}
                title="New Chat"
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  background: 'rgba(220, 190, 140, 0.1)',
                  border: '1px solid rgba(220, 190, 140, 0.3)',
                  color: 'var(--accent-gold)',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  flexShrink: 0
                }}
              >
                <MessageSquarePlus size={18} />
              </button>
            )}

            {isLoadingConversations ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                {!isHistoryCollapsed && "Loading..."}
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                {!isHistoryCollapsed && "No recent chats"}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', padding: isHistoryCollapsed ? '0 10px' : '0' }}>
                {conversations.map(conv => (
                  <div 
                    key={conv.id}
                    onClick={() => {
                      if (window.innerWidth < 768) setIsHistoryCollapsed(true);
                      selectConversation(conv.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isHistoryCollapsed ? 'center' : 'space-between',
                      padding: isHistoryCollapsed ? '12px 0' : '12px 16px',
                      borderRadius: '12px',
                      background: activeConversationId === conv.id ? 'rgba(220, 190, 140, 0.1)' : 'transparent',
                      border: `1px solid ${activeConversationId === conv.id ? 'rgba(220, 190, 140, 0.2)' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      color: activeConversationId === conv.id ? 'var(--accent-gold)' : 'var(--text-secondary)'
                    }}
                    title={isHistoryCollapsed ? conv.title || 'New Conversation' : ''}
                    onMouseOver={e => {
                      if (activeConversationId !== conv.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                    onMouseOut={e => {
                      if (activeConversationId !== conv.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {editingId === conv.id && !isHistoryCollapsed ? (
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px' }} onClick={e => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (editingTitle.trim()) renameConversation(conv.id, editingTitle);
                              setEditingId(null);
                            }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          style={{
                            flex: 1,
                            background: 'rgba(0,0,0,0.5)',
                            border: '1px solid rgba(220,190,140,0.5)',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '4px 6px',
                            fontSize: '0.85rem',
                            outline: 'none',
                            width: '100%'
                          }}
                        />
                        <button onClick={() => { if(editingTitle.trim()) renameConversation(conv.id, editingTitle); setEditingId(null); }} style={{ background:'none', border:'none', color:'#4ade80', cursor:'pointer', padding:'2px' }}><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', padding:'2px' }}><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', justifyContent: isHistoryCollapsed ? 'center' : 'flex-start' }}>
                          <MessageSquare size={16} style={{ flexShrink: 0, opacity: activeConversationId === conv.id ? 1 : 0.7 }} />
                          {!isHistoryCollapsed && (
                            <span style={{ 
                              fontSize: '0.85rem', 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              fontWeight: activeConversationId === conv.id ? 500 : 400
                            }}>
                              {conv.title || 'New Conversation'}
                            </span>
                          )}
                        </div>
                        {!isHistoryCollapsed && (
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(conv.id);
                                setEditingTitle(conv.title || 'New Conversation');
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.3)',
                                cursor: 'pointer',
                                padding: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px'
                              }}
                              onMouseOver={e => e.currentTarget.style.color = '#fff'}
                              onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                              title="Rename"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Delete this conversation?')) {
                                  deleteConversation(conv.id);
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.3)',
                                cursor: 'pointer',
                                padding: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px'
                              }}
                              onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Panel */}
        <div className="ai-chat-panel" style={{ flex: 1, margin: 0, borderRadius: '24px', border: '1px solid rgba(220, 190, 140, 0.15)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          
          {/* Chat Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5, 5, 5, 0.8)', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={toggleHistory}
                title={isHistoryCollapsed ? "Expand History" : "Collapse History"}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  borderRadius: '6px',
                  marginRight: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={e => e.currentTarget.style.color = '#fff'}
                onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              >
                <PanelLeft size={20} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}>
                <Sparkles size={16} color="rgba(220,190,140,1)" />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>FINWISE AI</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Financial Intelligence</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 8px rgba(74, 222, 128, 0.4)' }} />
              ONLINE
            </div>
          </div>

          {/* Chat Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '120px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {isLoadingMessages ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                <RefreshCw size={16} className="spin-animation" style={{ marginRight: '8px' }} />
                Loading conversation...
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }} className={msg.sender === 'user' ? 'user-message-container' : 'ai-message-container'}>
                    
                    {msg.sender === 'ai' ? (
                      <div className="ai-message" style={{ display: 'flex', gap: '16px', maxWidth: '85%' }}>
                        <div style={{ marginTop: '4px', flexShrink: 0 }}>
                          <Sparkles size={16} color="rgba(220, 190, 140, 0.8)" />
                        </div>
                        <div className="ai-markdown-content" style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="user-message" style={{ padding: '12px 20px', borderRadius: '100px', fontSize: '0.95rem', color: '#fff', maxWidth: '80%' }}>
                        {msg.text}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {isSending && (
              <div className="ai-message" style={{ display: 'flex', gap: '16px', maxWidth: '85%' }}>
                <div style={{ marginTop: '4px', flexShrink: 0 }}>
                  <Sparkles size={16} color="rgba(220, 190, 140, 0.8)" />
                </div>
                <div className="thinking-dots" style={{ height: '24px' }}>
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                </div>
              </div>
            )}
            
            {error && (
              <div className="ai-error-banner" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '12px',
                padding: '12px 20px', 
                borderRadius: '12px', 
                background: 'rgba(239, 68, 68, 0.08)', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'rgba(239, 68, 68, 0.9)', 
                fontSize: '0.85rem',
                maxWidth: '600px',
                alignSelf: 'center'
              }}>
                <span>{error}</span>
                <button 
                  onClick={clearError}
                  style={{ 
                    background: 'none', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                    borderRadius: '6px',
                    color: 'rgba(239, 68, 68, 0.9)', 
                    cursor: 'pointer', 
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <RefreshCw size={12} />
                  Dismiss
                </button>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Floating Chat Input Area */}
          <div style={{ 
            position: 'absolute', 
            bottom: '24px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: 'calc(100% - 48px)', 
            maxWidth: '800px',
            zIndex: 20 
          }}>
            <div className="chat-input-wrapper" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              background: 'rgba(10, 10, 10, 0.65)', 
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.15)', 
              boxShadow: '0 10px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              padding: '8px 8px 8px 16px', 
              borderRadius: '100px' 
            }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', borderRadius: '50%', transition: 'background 0.2s' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={18} color="rgba(255,255,255,0.4)" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
              />
              <input 
                type="text" 
                placeholder="Ask FinWise anything about your money..." 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isSending}
                style={{ flex: 1 }}
              />
              <button 
                className="chat-send-btn" 
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
