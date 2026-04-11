import React from 'react';
import type { LucideProps } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';

interface ThemedIconProps extends LucideProps {
  icon: React.ComponentType<LucideProps>;
  baseColor?: string;
}

export function ThemedIcon({ icon: Icon, baseColor, ...props }: ThemedIconProps) {
  const { matchIconsToTheme } = usePreferences();
  
  // Use theme color if setting is enabled, otherwise use provided baseColor or default
  const color = matchIconsToTheme 
    ? 'var(--schemes-primary)' 
    : (baseColor || 'var(--schemes-on-surface-variant)');

  return (
    <div style={{ display: 'inline-flex', transition: 'color 0.3s ease' }}>
      <Icon 
        {...props} 
        color={color} 
        style={{ 
          filter: matchIconsToTheme ? 'drop-shadow(0 0 8px var(--schemes-primary-container))' : 'none',
          ...props.style 
        }}
      />
    </div>
  );
}
