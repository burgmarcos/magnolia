import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Delete, Divide, Minus, Plus, X, Equal } from 'lucide-react';
import styles from './CalculatorApp.module.css';

export function CalculatorApp() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isResult, setIsResult] = useState(false);

  const handleNumber = useCallback((n: string) => {
    if (display === '0' || isResult) {
      setDisplay(n);
      setIsResult(false);
    } else {
      setDisplay(prev => prev + n);
    }
  }, [display, isResult]);

  const handleOperator = useCallback((op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
    setIsResult(false);
  }, [display]);

  const calculate = useCallback(() => {
    try {
      const fullEquation = (equation + display).replace(/X/g, '*');
      // Simple and safer calculation for v0.0.4
      const result = new Function(`return ${fullEquation}`)();
      setDisplay(String(result));
      setEquation('');
      setIsResult(true);
    } catch {
      setDisplay('Error');
    }
  }, [display, equation]);

  const clear = useCallback(() => {
    setDisplay('0');
    setEquation('');
  }, []);

   
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
      if (e.key === '.') handleNumber('.');
      if (e.key === '+') handleOperator('+');
      if (e.key === '-') handleOperator('-');
      if (e.key === '*') handleOperator('X');
      if (e.key === '/') handleOperator('/');
      if (e.key === 'Enter' || e.key === '=') calculate();
      if (e.key === 'Backspace') setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      if (e.key === 'Escape') clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumber, handleOperator, calculate, clear]);

  return (
    <div className={styles.container}>
      <div className={styles.display}>
        <p className={styles.equation}>{equation}</p>
        <motion.h1 
          key={display}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={styles.currentValue}
        >
          {display}
        </motion.h1>
      </div>

      <div className={styles.grid}>
        <button className={styles.button} onClick={clear}>AC</button>
        <button className={`${styles.button} ${styles.operator}`} onClick={() => handleOperator('/')}><Divide size={20} /></button>
        <button className={`${styles.button} ${styles.operator}`} onClick={() => handleOperator('X')}><X size={20} /></button>
        <button className={styles.button} onClick={() => setDisplay(prev => prev.slice(0, -1) || '0')}><Delete size={20} /></button>

        {[7, 8, 9].map(n => (
          <button key={n} className={styles.button} onClick={() => handleNumber(String(n))}>{n}</button>
        ))}
        <button className={`${styles.button} ${styles.operator}`} onClick={() => handleOperator('-')}><Minus size={20} /></button>

        {[4, 5, 6].map(n => (
          <button key={n} className={styles.button} onClick={() => handleNumber(String(n))}>{n}</button>
        ))}
        <button className={`${styles.button} ${styles.operator}`} onClick={() => handleOperator('+')}><Plus size={20} /></button>

        {[1, 2, 3].map(n => (
          <button key={n} className={styles.button} onClick={() => handleNumber(String(n))}>{n}</button>
        ))}
        <button className={`${styles.button} ${styles.equal}`} onClick={calculate}><Equal size={28} /></button>

        <button className={`${styles.button} ${styles.zero}`} onClick={() => handleNumber('0')}>0</button>
        <button className={styles.button} onClick={() => handleNumber('.')}>.</button>
      </div>
    </div>
  );
}
