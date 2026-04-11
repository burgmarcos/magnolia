import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Key, Download, Sparkles } from 'lucide-react';

interface Props {
  onOpenBrowser: (url: string) => void;
  onOpenModels: () => void;
}

export function ChatSetupWalkthrough({ onOpenBrowser, onOpenModels }: Props) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Magnolia Brain",
      description: "You're one step away from running your own private AI. No clouds, no subscriptions, just pure local intelligence.",
      icon: <Sparkles size={48} color="var(--schemes-primary)" />,
    },
    {
      title: "Step 1: Get your API Key",
      description: "To search the Hugging Face hub, you need a free Read-only token. Click below to open the browser and copy yours.",
      icon: <Key size={48} color="var(--schemes-primary)" />,
      action: () => onOpenBrowser("https://huggingface.co/settings/tokens"),
      actionLabel: "Get API Key"
    },
    {
      title: "Step 2: Install a Model",
      description: "Once your key is set, visit the Models Downloader to pick a 'Brain' for Magnolia. We recommend Llama 3 or Mistral.",
      icon: <Download size={48} color="var(--schemes-primary)" />,
      action: onOpenModels,
      actionLabel: "Open Models Hub"
    }
  ];

  const current = steps[step];

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '48px',
      textAlign: 'center',
      background: 'var(--schemes-surface)'
    }}>
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -10 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          style={{ 
            maxWidth: '420px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            padding: '40px',
            borderRadius: '40px',
            background: 'var(--schemes-surface-container-low)',
            boxShadow: 'var(--elevation-level-2)'
          }}
        >
          <div style={{ marginBottom: '32px', padding: '24px', borderRadius: '32px', background: 'var(--schemes-surface-container-highest)' }}>
            {current.icon}
          </div>
          
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--schemes-on-surface)' }}>{current.title}</h2>
          <p style={{ color: 'var(--schemes-on-surface-variant)', lineHeight: 1.6, marginBottom: '32px' }}>{current.description}</p>

          {current.action && (
            <button 
              onClick={current.action}
              style={{
                padding: '12px 24px',
                borderRadius: '100px',
                background: 'var(--schemes-primary)',
                color: 'var(--schemes-on-primary)',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px'
              }}
            >
              {current.actionLabel} <ArrowRight size={18} />
            </button>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ width: '24px' }}>
              {step > 0 && (
                <button 
                  onClick={() => setStep(s => s - 1)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <ArrowLeft size={24} color="var(--schemes-on-surface)" />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', margin: '0 16px' }}>
              {steps.map((_, i) => (
                <div key={i} style={{ 
                  width: i === step ? '20px' : '8px', 
                  height: '8px', 
                  borderRadius: '4px', 
                  background: i === step ? 'var(--schemes-primary)' : 'var(--schemes-primary-container)',
                  transition: 'width 0.3s'
                }} />
              ))}
            </div>
            <div style={{ width: '24px' }}>
              {step < steps.length - 1 && (
                <button 
                  onClick={() => setStep(s => s + 1)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <ArrowRight size={24} color="var(--schemes-on-surface)" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
