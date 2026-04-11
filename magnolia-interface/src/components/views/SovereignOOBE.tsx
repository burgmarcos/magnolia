import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Cloud, Rocket, CheckCircle2, Copy, Printer, Globe, Smartphone, ChevronRight } from 'lucide-react';

export function SovereignOOBE({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  const generateMnemonic = async () => {
    setLoading(true);
    try {
      const phrase = await invoke<string>('generate_recovery_key');
      setMnemonic(phrase.split(' '));
      setStep(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    setCommitting(true);
    try {
      await invoke('commit_identity', { mnemonic: mnemonic.join(' ') });
      setStep(2);
    } catch (e) {
      console.error(e);
    } finally {
      setCommitting(false);
    }
  };

  const providers = [
    { id: 'google', name: 'Google', icon: <Globe size={20} />, color: '#4285F4' },
    { id: 'apple', name: 'Apple', icon: <Smartphone size={20} />, color: '#000000' },
    { id: 'github', name: 'GitHub', icon: <Shield size={20} />, color: '#333' },
    { id: 'passkey', name: 'Passkey / Passphrase', icon: <Key size={20} />, color: 'var(--schemes-primary)' },
  ];

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#fff',
      overflow: 'hidden'
    }}>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="welcome" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
            style={{ textAlign: 'center', maxWidth: '600px', padding: 40 }}>
            <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 40px' }}>
              <Shield size={120} color="var(--schemes-primary)" style={{ filter: 'drop-shadow(0 0 30px var(--schemes-primary))' }} />
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 800, marginBottom: 20, letterSpacing: '-0.02em' }}>Welcome to Magnolia.</h1>
            <p style={{ fontSize: 19, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 48 }}>
              You are now entering a sovereign intelligence environment. <br />
              All data is local-first. Only YOU hold the keys.
            </p>
            <button onClick={generateMnemonic} disabled={loading} style={{
              background: 'var(--schemes-primary)', color: '#fff', border: 'none', padding: '18px 48px', borderRadius: 100,
              fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, margin: '0 auto'
            }}>
              {loading ? "Generating Vault..." : "Initialize Identity"} <ChevronRight size={20} />
            </button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="mnemonic" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }}
            style={{ textAlign: 'center', maxWidth: '850px', padding: 40 }}>
            <Key size={60} color="var(--schemes-primary)" style={{ marginBottom: 24 }} />
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Securing your Vault.</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 40, fontSize: 17 }}>
              This 24-word mnemonic is your system seed. Store it offline. 
              Magnolia cannot recover your data if these words are lost.
            </p>
            
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
              background: 'rgba(255,255,255,0.03)', padding: 32, borderRadius: 32, border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 40
            }}>
              {mnemonic.map((word: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--schemes-primary)', opacity: 0.5, fontWeight: 600 }}>{i + 1}</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{word}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 48 }}>
              <button style={{ padding: '12px 24px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Copy size={16} /> Copy
              </button>
              <button style={{ padding: '12px 24px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={16} /> Print Mnemonic
              </button>
            </div>

            <button onClick={handleCommit} disabled={committing} style={{
              background: 'var(--schemes-primary)', color: '#fff', border: 'none', padding: '16px 40px', borderRadius: 100,
              fontSize: 18, fontWeight: 700, cursor: 'pointer'
            }}>
              {committing ? "Securing Vault..." : "I Have Secured My Words"}
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="parallel" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            style={{ textAlign: 'center', maxWidth: '700px', padding: 40 }}>
            <Cloud size={80} color="var(--schemes-primary)" style={{ marginBottom: 32 }} />
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Optional: Sovereign Cloud</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 40, fontSize: 17 }}>
              Sync your Zero-Knowledge encrypted vault to the cloud for backup across devices. 
              We use 3rd-party auth systems so we never touch your password.
            </p>
            
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16,
              marginBottom: 48
            }}>
              {providers.map(p => (
                <button key={p.id} onClick={() => setStep(3)} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  padding: '16px 24px', borderRadius: 24, color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 16, transition: 'background 0.2s'
                }}>
                  <div style={{ background: p.color, width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.icon}
                  </div>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setStep(3)} style={{
              background: 'var(--schemes-surface-container-highest)', color: 'var(--schemes-primary)',
              border: 'none', padding: '18px 60px', borderRadius: 100, fontSize: 19, fontWeight: 800, cursor: 'pointer'
            }}>
              Skip & Stay Local-Only
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="final" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', maxWidth: '500px', padding: 40 }}>
            <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 32px' }}>
              <Rocket size={100} color="var(--schemes-tertiary)" style={{ filter: 'drop-shadow(0 0 25px var(--schemes-tertiary))' }} />
              <div style={{ position: 'absolute', bottom: -10, right: -10, background: '#0a0a0a', borderRadius: '50%', padding: 4 }}>
                <CheckCircle2 size={44} color="var(--schemes-primary)" />
              </div>
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 900, marginBottom: 16 }}>Magnolia is Ready.</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, marginBottom: 48, lineHeight: 1.6 }}>
              Local Vault locked. Identity established. <br />
              Welcome to the first truly private OS.
            </p>
            <button onClick={onComplete} style={{
              background: 'linear-gradient(135deg, var(--schemes-primary), var(--schemes-secondary))', 
              color: '#fff', border: 'none', padding: '20px 60px', borderRadius: 100,
              fontSize: 20, fontWeight: 900, cursor: 'pointer', boxShadow: '0 15px 40px rgba(0,0,0,0.5)'
            }}>
              Launch Workspace
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
