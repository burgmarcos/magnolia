import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import styles from './HardwareFitChip.module.css';

export type FitState = 'perfect' | 'offload' | 'cannot-run';

interface HardwareFitChipProps {
  fitState: FitState;
  /**
   * Optional custom text to display. If not provided, defaults to standard state text.
   */
  label?: string;
}

export function HardwareFitChip({ fitState, label }: HardwareFitChipProps) {
  let config = {
    text: '',
    icon: <CheckCircle size={16} />,
    chipClass: styles.chipPerfect,
  };

  switch (fitState) {
    case 'perfect':
      config = {
        text: label || 'Fits Perfectly',
        icon: <CheckCircle size={16} />,
        chipClass: styles.chipPerfect,
      };
      break;
    case 'offload':
      config = {
        text: label || 'Needs Offload',
        icon: <AlertTriangle size={16} />,
        chipClass: styles.chipOffload,
      };
      break;
    case 'cannot-run':
      config = {
        text: label || 'Does Not Run',
        icon: <XCircle size={16} />,
        chipClass: styles.chipCannotRun,
      };
      break;
  }

  return (
    <div className={`${styles.chipBase} ${config.chipClass}`}>
      <div className={styles.iconWrapper}>
        {config.icon}
      </div>
      <span className={styles.chipText}>{config.text}</span>
    </div>
  );
}
