import React from 'react';
import { Bot } from 'lucide-react';

interface AIChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
  hasUnread?: boolean;
}

export const AIChatButton: React.FC<AIChatButtonProps> = ({
  onClick,
  isOpen,
  hasUnread = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm
                  transition-colors ${
                    isOpen
                      ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
      title="AI Chat (Cmd+J)"
    >
      <div className="relative">
        <Bot className="h-4 w-4" />
        {hasUnread && (
          <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-violet-500" />
        )}
      </div>
      <span>AI Chat</span>
      <kbd className="ml-auto text-[10px] text-muted-foreground/50 font-mono">Cmd+J</kbd>
    </button>
  );
};

export default AIChatButton;
