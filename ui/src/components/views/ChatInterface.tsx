import { useState, useRef, useEffect } from 'react';
import { Mic, ArrowUp, Loader2 } from 'lucide-react';
import styles from './ChatInterface.module.css';

// Using core API invoker here so it's ready for wiring later if needed
// import { invoke } from '@tauri-apps/api/core';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! How can I help you today?' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    setMessages([...messages, { role: 'user', content: inputText.trim() }]);
    setInputText('');
    
    // Simulate AI response for now
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: "This is a simulated response. Backend wiring will replace this." }]);
    }, 1500);
  };

  return (
    <div className={styles.container}>
      {/* App Bar equivalent */}
      <div className={styles.appBar}>
        <div className={styles.modelHeader}>
          <h3>Llama 3 (8B)</h3>
        </div>
      </div>

      {/* Conversation Area */}
      <div className={styles.conversationArea}>
        {messages.map((message, index) => (
          <div 
            key={index} 
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
          </div>
        ))}

        {isTyping && (
          <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
            <div className={styles.avatarSpace}>
               <div className={styles.avatarPlaceholder} />
            </div>
            <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
               <Loader2 className={styles.typingIndicator} size={16} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar Area */}
      <div className={styles.inputBar}>
        <div className={styles.searchContainer}>
          <input 
            type="text" 
            className={styles.searchInput}
            placeholder="Talk to SLAI..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          {inputText.trim() ? (
            <button className={styles.actionIconButton} onClick={handleSend} aria-label="Send Text">
              <ArrowUp size={20} color="var(--schemes-on-surface)" />
            </button>
          ) : null}
        </div>
        
        {/* Voice Input fallback button */}
        <button className={styles.actionIconButton} aria-label="Voice Input">
          <Mic size={24} color="var(--schemes-on-surface)" />
        </button>
      </div>
    </div>
  );
}
