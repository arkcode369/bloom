import React, { useState, useRef, useEffect } from 'react';
import {
  Send, X, Plus, Loader2, Bot, User, FileText,
  MessageSquare, Trash2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  noteRefs: string[];
  isStreaming?: boolean;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
  onNewSession: () => void;
  onStopStreaming: () => void;
  onNoteClick?: (noteId: string) => void;
  sessions?: { id: string; title: string; updated_at: string }[];
  onLoadSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  error?: string | null;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  isStreaming,
  onSendMessage,
  onNewSession,
  onStopStreaming,
  onNoteClick,
  sessions = [],
  onLoadSession,
  onDeleteSession,
  error,
}) => {
  const [input, setInput] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-l border-border/60 bg-background w-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">Bloom AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            title="Chat history"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <button
            onClick={onNewSession}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Session list dropdown */}
      {showSessions && sessions.length > 0 && (
        <div className="border-b border-border/60 max-h-48 overflow-y-auto">
          {sessions.map(session => (
            <div
              key={session.id}
              className="flex items-center justify-between px-3 py-2 hover:bg-accent/50
                         cursor-pointer text-xs transition-colors"
              onClick={() => { onLoadSession?.(session.id); setShowSessions(false); }}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{session.title}</div>
                <div className="text-muted-foreground text-[10px]">
                  {new Date(session.updated_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteSession?.(session.id); }}
                className="p-1 hover:bg-red-500/10 rounded"
              >
                <Trash2 className="h-3 w-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-10 w-10 mb-3 text-violet-500/30" />
            <p className="text-sm font-medium">Ask anything about your notes</p>
            <p className="text-xs mt-1">I'll search your knowledge base to give contextual answers.</p>
          </div>
        )}

        {messages.filter(m => m.role !== 'system').map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="shrink-0 mt-1">
                <div className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-violet-500" />
                </div>
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-violet-500 animate-pulse ml-0.5 rounded-sm" />
              )}
              {msg.noteRefs.length > 0 && !msg.isStreaming && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <div className="text-[10px] text-muted-foreground mb-1">Sources:</div>
                  <div className="flex flex-wrap gap-1">
                    {msg.noteRefs.slice(0, 5).map((noteId) => (
                      <button
                        key={noteId}
                        onClick={() => onNoteClick?.(noteId)}
                        className="flex items-center gap-0.5 rounded bg-background/80 px-1.5 py-0.5
                                   text-[10px] hover:bg-accent transition-colors"
                      >
                        <FileText className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[100px]">{noteId.slice(0, 8)}...</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="shrink-0 mt-1">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="text-xs text-red-500 bg-red-500/5 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border/60 p-3">
        {isStreaming && (
          <button
            onClick={onStopStreaming}
            className="w-full mb-2 flex items-center justify-center gap-1 rounded-md
                       bg-destructive/10 py-1 text-xs text-destructive hover:bg-destructive/20
                       transition-colors"
          >
            Stop generating
          </button>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your notes..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border/60 bg-muted/30
                       px-3 py-2 text-sm placeholder:text-muted-foreground/50
                       focus:outline-none focus:ring-1 focus:ring-violet-500/50
                       max-h-24"
            style={{ minHeight: '38px' }}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 rounded-lg bg-violet-600 p-2 text-white
                       hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
