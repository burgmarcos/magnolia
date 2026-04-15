import { useState, useEffect } from 'react';
import { Send, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './TelegramSettings.module.css';

// Standalone component

const isMissingSecretError = (error: unknown) => {
  const message = String(error).toLowerCase();
  const detail = message.includes(':') ? message.split(':').slice(1).join(':').trim() : message;

  return [
    'not found',
    'no entry',
    'no such',
    'does not exist',
    'item not found',
    'credentials not found'
  ].some((keyword) => detail.includes(keyword));
};

export function TelegramSettings() {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        
        // Load Bot Token
        try {
          const token = await invoke<string>('get_api_key', { service: 'telegram_bot' });
          setBotToken(token);
        } catch (error) {
          if (!isMissingSecretError(error)) {
            toast.error('Failed to load Telegram bot token from secure storage');
          }
        }

        // Load Chat ID
        try {
          const id = await invoke<string>('get_api_key', { service: 'telegram_chat_id' });
          setChatId(id);
        } catch (error) {
          if (!isMissingSecretError(error)) {
            toast.error('Failed to load Telegram chat id from secure storage');
          }
        }
      } catch {
        toast.error('Failed to access secure storage');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast.error('Please fill in both fields');
      return;
    }

    setIsSaving(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      await invoke('set_api_key', { service: 'telegram_bot', key: botToken });
      await invoke('set_api_key', { service: 'telegram_chat_id', key: chatId });
      
      toast.success('Telegram configuration saved securely!');
    } catch (e) {
      toast.error(`Save failed: ${String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>Loading Configuration...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>Telegram Integration</h2>

      <div className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Bot Token</label>
          <div className={styles.inputContainer}>
            <input
              type="password"
              className={styles.input}
              placeholder="123456789:ABCDefgh..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
          </div>
          <p className={styles.hint}>Obtained from @BotFather on Telegram</p>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Chat ID</label>
          <div className={styles.inputContainer}>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. 987654321"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
          </div>
          <p className={styles.hint}>Your personal ID or a group ID</p>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.saveButton} 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              'Saving...'
            ) : (
              <>
                <ShieldCheck size={18} />
                Save Securely
              </>
            )}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '16px', borderRadius: '12px', background: 'var(--schemes-surface-container-high)' }}>
        <Send size={24} color="var(--schemes-primary)" style={{ marginTop: '4px' }} />
        <div>
          <p style={{ fontWeight: 500, color: 'var(--schemes-on-surface)', marginBottom: '4px' }}>How it works</p>
          <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)', lineHeight: 1.5 }}>
            Your credentials are encrypted and stored in your operating system's native keychain (macOS Keychain, Windows Credential Manager, or Secret Service). They never touch the disk in plaintext.
          </p>
        </div>
      </div>
    </div>
  );
}
