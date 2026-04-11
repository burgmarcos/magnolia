import { useState, useRef, useEffect } from 'react';
import { Mic, ArrowUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ChatSetupWalkthrough } from './ChatSetupWalkthrough.tsx';
import { useLanguage } from '../../context/LanguageContext';
import styles from './ChatInterface.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatChunk {
  token: string;
  is_done: boolean;
}

const transition = {
  duration: 0.6,
  ease: [0.2, 0, 0, 1.0]
} as const;

export function ChatInterface() {
  const { translate } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: translate('chat.welcome') },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial check for active models
    invoke<string[]>('get_local_models').then(models => {
      // For now, if we have any local model, we assume setup is "done" 
      // or we can check if the engine is running
      if (models.length > 0) {
        setActiveModel(models[0]); // Default to first for UI display
      }
    });

    // Listen for streaming tokens from the backend
    const unlisten = listen<ChatChunk>('chat-token', (event) => {
      const chunk = event.payload;
      
      setIsTyping(false); 
      
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && !chunk.is_done) {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, content: lastMessage.content + chunk.token }
          ];
        } else if (!chunk.is_done) {
          return [...prev, { role: 'assistant', content: chunk.token }];
        }
        return prev;
      });
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput) return;

    // Command Interceptor
    if (trimmedInput.toLowerCase() === '/help') {
      const helpMsg: Message = { role: 'user', content: '/help' };
      const responseMsg: Message = { 
        role: 'assistant', 
        content: `**Magnolia System Commands:**\n\n` +
                 `- \`/help\`: Show this directory.\n` +
                 `- \`/about\`: The Magnolia Sovereign Vision.\n` +
                 `- \`/status\`: Check system health and partitions.\n` +
                 `- \`/apps\`: List installed sandboxed applications.\n\n` +
                 `You can also ask me anything naturally! I am trained on the Magnolia Knowledge Base.`
      };
      setMessages([...messages, helpMsg, responseMsg]);
      setInputText('');
      return;
    }

    const userMsg: Message = { role: 'user', content: trimmedInput };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    try {
      // Map to backend format
      const tauriMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      await invoke('stream_chat_local', { messages: tauriMessages });
    } catch (err) {
      console.error("Inference error:", err);
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` }]);
    }
  };

  if (!activeModel) {
    return (
      <ChatSetupWalkthrough 
        onOpenBrowser={(url) => {
          // Send event to outer App to open Browser with URL
          window.dispatchEvent(new CustomEvent('Magnolia-open-app', { 
            detail: { type: 'browser', title: 'Magnolia Browser', url } 
          }));
        }}
        onOpenModels={() => {
          window.dispatchEvent(new CustomEvent('Magnolia-open-app', { 
            detail: { type: 'files', title: 'Models' } // Models are in the files/downloader
          }));
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* App Bar equivalent */}
      <div className={styles.appBar}>
        <div className={styles.modelHeader}>
          <h3>{activeModel}</h3>
        </div>
      </div>

      {/* Conversation Area */}
      <div className={styles.conversationArea}>
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...transition, delay: index === messages.length - 1 ? 0 : 0.05 }}
              className={`${styles.messageRow} ${message.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant}`}
            >
              {message.role === 'assistant' && (
                <div className={styles.avatarSpace}>
                   <div className={styles.avatarPlaceholder} />
                </div>
              )}
              
              <div className={`${styles.bubble} ${message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
                {message.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${styles.messageRow} ${styles.messageRowAssistant}`}
          >
            <div className={styles.avatarSpace}>
               <div className={styles.avatarPlaceholder} />
            </div>
            <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
               <Loader2 className={styles.typingIndicator} size={16} />
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar Area */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={styles.inputBar}
      >
        <div className={styles.searchContainer}>
          <input 
            type="text" 
            className={styles.searchInput}
            placeholder="Talk to Magnolia..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <AnimatePresence>
            {inputText.trim() && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={styles.actionIconButton} 
                onClick={handleSend} 
                aria-label="Send Text"
              >
                <ArrowUp size={20} color="var(--schemes-on-surface)" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        
        <button className={styles.actionIconButton} aria-label="Voice Input">
          <Mic size={24} color="var(--schemes-on-surface)" />
        </button>
      </motion.div>
    </div>
  );
}
