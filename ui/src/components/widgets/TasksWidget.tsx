import { useState } from 'react';
import { Minus, Plus, Check } from 'lucide-react';
import styles from './TasksWidget.module.css';

export function TasksWidget() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Design System mapping', completed: true },
    { id: 2, text: 'Build XRAppBar', completed: true },
    { id: 3, text: 'Translate to Tailwind/CSS', completed: false },
    { id: 4, text: 'Tasks Widget State', completed: false },
    { id: 5, text: 'App Windows Layout', completed: false },
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.headline}>Tasks</h2>
        </div>
        <div className={styles.headerControls}>
          <button className={styles.iconButtonError} aria-label="Hide Tasks">
            <Minus size={20} color="var(--bOS-sys-light-on-error-container, #93000A)" />
          </button>
        </div>
      </div>

      <div className={styles.list}>
        {tasks.map(task => (
          <div key={task.id} className={styles.listItem} onClick={() => toggleTask(task.id)}>
            <div className={styles.listIconContainer}>
              <div className={styles.avatar}>A</div>
            </div>
            <div className={styles.listText}>
              <p className={styles.bodyLarge}>{task.text}</p>
            </div>
            <div className={styles.listTrailing}>
              <div className={`${styles.checkbox} ${task.completed ? styles.checkboxChecked : ''}`}>
                {task.completed && <Check size={16} color="var(--schemes-on-primary)" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <div className={styles.divider} />
        <div className={styles.buttonsRow}>
          <button className={styles.secondaryButton}>
            Clear
          </button>
          <button className={styles.primaryButton}>
            <Plus size={18} style={{ marginRight: '8px' }} />
            Add todo
          </button>
        </div>
      </div>
    </div>
  );
}
