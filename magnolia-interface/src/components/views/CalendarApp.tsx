/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface CalendarEvent {
  id: string;
  day: number;
  title: string;
  color: string;
  textColor: string;
}

export function CalendarApp() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: '1', day: 14, title: 'Deployment', color: 'var(--schemes-primary)', textColor: 'var(--schemes-on-primary)' },
    { id: '2', day: 22, title: 'OS Hardening', color: 'var(--schemes-secondary)', textColor: 'var(--schemes-on-secondary)' }
  ]);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  const calendarDays = Array.from({ length: 35 }, (_, i) => i - 3); 

  const groupedEvents = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    for (const e of events) {
      if (!map[e.day]) map[e.day] = [];
      map[e.day].push(e);
    }
    return map;
  }, [events]);

  const updateEvent = () => {
    if (editingEvent) {
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? editingEvent : e));
      setEditingEvent(null);
    }
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setEditingEvent(null);
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--schemes-surface-container-lowest)', position: 'relative' }}>
      {/* Sidebar */}
      <div style={{ width: '240px', borderRight: '1px solid var(--schemes-outline-variant)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <button 
          onClick={() => {
            const newEvent = { id: Date.now().toString(), day: 1, title: 'New Event', color: 'var(--schemes-primary)', textColor: 'var(--schemes-on-primary)' };
            setEvents(prev => [...prev, newEvent]);
            setEditingEvent(newEvent);
          }}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--schemes-primary)', color: 'var(--schemes-on-primary)', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <Plus size={18} /> Create
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-outline)', textTransform: 'uppercase' }}>Calendars</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#4285F4' }} /> Personal</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#34A853' }} /> Work</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '16px 24px', borderBottom: '1px solid var(--schemes-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{monthName} {year}</h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button style={navBtn}><ChevronLeft size={18} /></button>
              <button style={navBtn}><ChevronRight size={18} /></button>
            </div>
            <button style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--schemes-outline-variant)', fontSize: '13px', background: 'transparent' }}>Today</button>
          </div>
          
          <div style={{ display: 'flex', background: 'var(--schemes-surface-container-high)', borderRadius: '100px', padding: '4px' }}>
            {['Month', 'Week', 'Day'].map(v => (
              <button key={v} onClick={() => setView(v.toLowerCase() as any)} style={{ padding: '6px 16px', borderRadius: '100px', border: 'none', fontSize: '13px', fontWeight: 600, background: view === v.toLowerCase() ? 'white' : 'transparent', color: view === v.toLowerCase() ? 'var(--schemes-primary)' : 'var(--schemes-on-surface-variant)', boxShadow: view === v.toLowerCase() ? 'var(--elevation-light-1)' : 'none' }}>{v}</button>
            ))}
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {view === 'month' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'auto repeat(5, 1fr)', height: '100%', minHeight: '600px', background: 'var(--schemes-outline-variant)' }}>
              {days.map(d => (
                <div key={d} style={{ background: 'var(--schemes-surface-container-low)', padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--schemes-on-surface-variant)', borderBottom: '1px solid var(--schemes-outline-variant)' }}>{d}</div>
              ))}
              {calendarDays.map((d, i) => (
                <div key={i} style={{ background: 'white', border: '0.1px solid var(--schemes-outline-variant)', padding: '4px', position: 'relative', minHeight: '120px' }}>
                  <span style={{ fontSize: '12px', padding: '4px', fontWeight: (d > 0 && d < 32) ? 600 : 300, opacity: (d > 0 && d < 32) ? 1 : 0.3 }}>{d > 0 && d < 32 ? d : d <= 0 ? 30 + d : d - 31}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                    {(groupedEvents[d] || []).map(e => (
                      <div key={e.id} onClick={() => setEditingEvent(e)} style={{ padding: '4px 8px', borderRadius: '4px', background: e.color, color: e.textColor, fontSize: '10px', fontWeight: 600, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {view !== 'month' && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>View Optimization in Progress</div>}
        </div>
      </div>

      {/* Sovereign Event Modal */}
      {editingEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'var(--schemes-surface-container)', padding: '32px', borderRadius: '32px', width: '400px', boxShadow: 'var(--elevation-light-5)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Edit Event</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input value={editingEvent.title} onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })} style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--schemes-outline)', background: 'var(--schemes-surface-container-high)', outline: 'none' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                {['#4285F4', '#34A853', '#EA4335', '#FBBC05'].map(c => (
                  <button key={c} onClick={() => setEditingEvent({ ...editingEvent, color: c })} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c, border: editingEvent.color === c ? '3px solid white' : 'none', cursor: 'pointer', boxShadow: 'var(--elevation-light-1)' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
              <button onClick={() => deleteEvent(editingEvent.id)} style={{ padding: '12px', color: 'var(--schemes-error)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
              <button onClick={() => setEditingEvent(null)} style={{ padding: '12px 24px', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={updateEvent} style={{ padding: '12px 32px', borderRadius: '100px', background: 'var(--schemes-primary)', color: 'var(--schemes-on-primary)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn = {
  padding: '6px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--schemes-on-surface)',
  transition: 'background 0.2s'
};
