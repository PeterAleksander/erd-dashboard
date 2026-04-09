import { useState } from 'react';
import ERDDashboard from './components/ERDDashboard';
import DNSLetterGenerator from './components/DNSLetterGenerator';
import './App.css';

const TABS = [
  { id: 'erd',  label: 'ERD Dashboard' },
  { id: 'dns',  label: 'DNS Letter Generator' },
];

function App() {
  const [tab, setTab] = useState('erd');

  return (
    <div className="App" style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#0c0c0e 0%,#18181b 100%)' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: '16px 16px 0', borderBottom: '1px solid #3f3f46', background: '#0c0c0e' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 20px',
              borderRadius: '6px 6px 0 0',
              border: '1px solid',
              borderBottom: 'none',
              borderColor: tab === t.id ? '#3f3f46' : 'transparent',
              background: tab === t.id ? '#18181b' : 'transparent',
              color: tab === t.id ? '#f59e0b' : '#71717a',
              fontFamily: "'JetBrains Mono','Fira Code','SF Mono',monospace",
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              position: 'relative',
              bottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px' }}>
        {tab === 'erd' && <ERDDashboard />}
        {tab === 'dns' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#e4e4e7', letterSpacing: '-0.3px', fontFamily: "'JetBrains Mono',monospace" }}>
                DNS Letter Generator
              </h1>
            </div>
            <p style={{ fontSize: 11, color: '#52525b', marginLeft: 22, marginBottom: 24, fontFamily: "'JetBrains Mono',monospace" }}>
              Paste TSV onboarding data → get formatted DNS config letters for Zendesk
            </p>
            <DNSLetterGenerator />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
