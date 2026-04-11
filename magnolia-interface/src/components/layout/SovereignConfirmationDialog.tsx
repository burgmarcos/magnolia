import { useState } from 'react';
import { ShieldAlert, Key, UserCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SovereignConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pin: string, username: string) => void;
  title: string;
  description: string;
  actionLabel: string;
}

export function SovereignConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionLabel
}: SovereignConfirmationDialogProps) {
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');

  const handleConfirm = () => {
    onConfirm(pin, username);
    setPin('');
    setUsername('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'var(--schemes-surface-container-highest)',
              borderRadius: '32px',
              border: '1px solid var(--schemes-outline-variant)',
              padding: '32px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
              position: 'relative'
            }}
          >
            <button 
              onClick={onClose}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'var(--schemes-on-surface-variant)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--schemes-error-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <ShieldAlert size={32} color="var(--schemes-on-error-container)" />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px' }}>{title}</h2>
            <p style={{ fontSize: '15px', color: 'var(--schemes-on-surface-variant)', lineHeight: '1.6', margin: '0 0 32px' }}>{description}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', opacity: 0.7 }}>SECURITY PIN</label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input 
                    type="password"
                    placeholder="Enter 4-digit PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px 16px 16px 48px',
                      borderRadius: '16px',
                      background: 'var(--schemes-surface)',
                      border: '1px solid var(--schemes-outline)',
                      fontSize: '16px',
                      fontWeight: 600,
                      letterSpacing: '0.2em'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', opacity: 0.7 }}>CONFIRM IDENTITY (TYPE USERNAME)</label>
                <div style={{ position: 'relative' }}>
                  <UserCheck size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input 
                    type="text"
                    placeholder="Type username exactly"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px 16px 16px 48px',
                      borderRadius: '16px',
                      background: 'var(--schemes-surface)',
                      border: '1px solid var(--schemes-outline)',
                      fontSize: '15px',
                      fontWeight: 600
                    }}
                  />
                </div>
              </div>

              <button 
                onClick={handleConfirm}
                disabled={!pin || !username}
                style={{
                  marginTop: '12px',
                  padding: '18px',
                  borderRadius: '100px',
                  background: 'var(--schemes-error)',
                  color: 'white',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: (pin && username) ? 'pointer' : 'not-allowed',
                  boxShadow: '0 8px 24px rgba(186,26,26,0.3)',
                  opacity: (pin && username) ? 1 : 0.5
                }}
              >
                {actionLabel}
              </button>

              <button 
                onClick={onClose}
                style={{
                  padding: '14px',
                  background: 'transparent',
                  color: 'var(--schemes-on-surface)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel Action
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
