import { Calendar, Thermometer, Ruler } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useLanguage } from '../../context/LanguageContext';
import styles from './GeneralSettings.module.css';

export function RegionalSettings() {
  const { lang, setLang } = useLanguage();
  const { 
    unitSystem, setUnitSystem,
    dateFormat, setDateFormat,
    tempUnit, setTempUnit,
    firstDayOfWeek, setFirstDayOfWeek
  } = usePreferences();

  return (
    <div className={styles.container} style={{ height: '100%', overflowY: 'auto', padding: '32px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--schemes-on-surface)', marginBottom: '8px' }}>Regional & Units</h1>
        <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '15px' }}>Configure how Magnolia handles spatial and temporal dimensions.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Language Quick-Switch */}
        <section>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>System Language</p>
          <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)', display: 'flex', gap: '12px' }}>
             {(['en-US', 'pt-BR', 'es-LA'] as const).map(l => (
               <button 
                key={l}
                onClick={() => setLang(l)}
                style={{ 
                  flex: 1, 
                  padding: '16px', 
                  borderRadius: '16px', 
                  border: lang === l ? '2px solid var(--schemes-primary)' : '1px solid var(--schemes-outline-variant)',
                  background: lang === l ? 'var(--schemes-primary-container)' : 'transparent',
                  color: lang === l ? 'var(--schemes-on-primary-container)' : 'var(--schemes-on-surface)',
                  fontWeight: 700,
                  textAlign: 'center',
                  cursor: 'pointer'
                }}>
                 {l === 'en-US' ? 'English' : l === 'pt-BR' ? 'Português' : 'Español'}
               </button>
             ))}
          </div>
        </section>

        {/* Measurement Systems */}
        <section>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Scientific Standards</p>
          <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
             
             {/* Metric / Imperial */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                 <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--schemes-secondary-container)' }}>
                   <Ruler size={20} color="var(--schemes-on-secondary-container)" />
                 </div>
                 <div>
                   <p style={{ fontWeight: 700 }}>Measurement System</p>
                   <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Units for distance and mass throughout the system.</p>
                 </div>
               </div>
               <div style={{ display: 'flex', background: 'var(--schemes-surface-container-highest)', borderRadius: '100px', padding: '4px' }}>
                  <button onClick={() => setUnitSystem('metric')} style={{ padding: '8px 16px', borderRadius: '100px', background: unitSystem === 'metric' ? 'var(--schemes-primary)' : 'transparent', color: unitSystem === 'metric' ? 'var(--schemes-on-primary)' : 'var(--schemes-on-surface)', fontWeight: 700 }}>Metric</button>
                  <button onClick={() => setUnitSystem('imperial')} style={{ padding: '8px 16px', borderRadius: '100px', background: unitSystem === 'imperial' ? 'var(--schemes-primary)' : 'transparent', color: unitSystem === 'imperial' ? 'var(--schemes-on-primary)' : 'var(--schemes-on-surface)', fontWeight: 700 }}>Imperial</button>
               </div>
             </div>

             {/* Temp */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                 <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--schemes-tertiary-container)' }}>
                   <Thermometer size={20} color="var(--schemes-on-tertiary-container)" />
                 </div>
                 <div>
                   <p style={{ fontWeight: 700 }}>Temperature Scale</p>
                   <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Used in Weather and Hardware thermal monitors.</p>
                 </div>
               </div>
               <div style={{ display: 'flex', background: 'var(--schemes-surface-container-highest)', borderRadius: '100px', padding: '4px' }}>
                  <button onClick={() => setTempUnit('C')} style={{ padding: '8px 16px', borderRadius: '100px', background: tempUnit === 'C' ? 'var(--schemes-primary)' : 'transparent', color: tempUnit === 'C' ? 'var(--schemes-on-primary)' : 'var(--schemes-on-surface)', fontWeight: 700 }}>Celsius</button>
                  <button onClick={() => setTempUnit('F')} style={{ padding: '8px 16px', borderRadius: '100px', background: tempUnit === 'F' ? 'var(--schemes-primary)' : 'transparent', color: tempUnit === 'F' ? 'var(--schemes-on-primary)' : 'var(--schemes-on-surface)', fontWeight: 700 }}>Fahrenheit</button>
               </div>
             </div>

          </div>
        </section>

        {/* Date / Calendar */}
        <section>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Date & Chronology</p>
          <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
             
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                 <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--schemes-primary-container)' }}>
                   <Calendar size={20} color="var(--schemes-on-primary-container)" />
                 </div>
                 <div>
                   <p style={{ fontWeight: 700 }}>Date Preference</p>
                   <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Display sequence for days and months.</p>
                 </div>
               </div>
               <select 
                value={dateFormat}
                onChange={e => setDateFormat(e.target.value as 'DD/MM/YYYY' | 'MM/DD/YYYY')}
                style={{ background: 'var(--schemes-surface-container-highest)', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>
                 <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                 <option value="MM/DD/YYYY">MM/DD/YYYY</option>
               </select>
             </div>

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                 <p style={{ fontWeight: 700 }}>First Day of Week</p>
               </div>
               <div style={{ display: 'flex', background: 'var(--schemes-surface-container-highest)', borderRadius: '100px', padding: '4px' }}>
                  <button onClick={() => setFirstDayOfWeek(0)} style={{ padding: '8px 16px', borderRadius: '100px', background: firstDayOfWeek === 0 ? 'var(--schemes-primary)' : 'transparent', color: firstDayOfWeek === 0 ? 'var(--schemes-on-primary)' : 'var(--schemes-on-surface)', fontWeight: 700 }}>Sunday</button>
                  <button onClick={() => setFirstDayOfWeek(1)} style={{ padding: '8px 16px', borderRadius: '100px', background: firstDayOfWeek === 1 ? 'var(--schemes-primary)' : 'transparent', color: firstDayOfWeek === 1 ? 'var(--schemes-on-primary)' : 'var(--schemes-on-surface)', fontWeight: 700 }}>Monday</button>
               </div>
             </div>

          </div>
        </section>

      </div>
    </div>
  );
}
