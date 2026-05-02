import { useNavigate } from 'react-router-dom';
import { clearSession } from '../lib/session';

export function SettingsPage() {
  const navigate = useNavigate();

  function logout() {
    clearSession();
    navigate('/', { replace: true });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9ff', fontFamily: "'Work Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header className="waiter-topbar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" onClick={() => navigate('/board')} className="waiter-icon-button" title="Back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#111c2d' }}>Settings</span>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 680, width: '100%', margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Board Controls */}
        <section style={{ background: '#ffffff', borderRadius: 12, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #dbc2b0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ color: '#8d4b00' }}>tune</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111c2d', margin: 0 }}>Board Controls</h2>
          </div>
          <p style={{ fontSize: 14, color: '#554336', margin: 0 }}>
            The kitchen board automatically polls for new orders every 15 seconds. Tickets advance through <strong>Accepted → Preparing → Ready → Served</strong>.
          </p>
        </section>

        {/* Auto-refresh */}
        <section style={{ background: '#ffffff', borderRadius: 12, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #dbc2b0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ color: '#8d4b00' }}>refresh</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111c2d', margin: 0 }}>Live Refresh</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 14, color: '#554336', margin: 0 }}>Board auto-refreshes every 15 seconds.</p>
            <span style={{ fontSize: 12, fontWeight: 700, background: '#e7eeff', color: '#3a485b', padding: '4px 12px', borderRadius: 999 }}>15s interval</span>
          </div>
        </section>

        {/* Urgency Rules */}
        <section style={{ background: '#ffffff', borderRadius: 12, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #dbc2b0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ color: '#ba1a1a' }}>warning</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111c2d', margin: 0 }}>Urgency Rules</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#ffdad6', borderRadius: 8, border: '1px solid rgba(186,26,26,0.2)' }}>
              <span style={{ fontSize: 14, color: '#93000a', fontWeight: 600 }}>Urgent (red border)</span>
              <span style={{ fontSize: 13, color: '#93000a' }}>Waiting &gt; 10 minutes</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff8eb', borderRadius: 8, border: '1px solid #f7d397' }}>
              <span style={{ fontSize: 14, color: '#6f4300', fontWeight: 600 }}>Warning (amber)</span>
              <span style={{ fontSize: 13, color: '#6f4300' }}>Waiting 5–10 minutes</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f0f3ff', borderRadius: 8, border: '1px solid #d8e3fb' }}>
              <span style={{ fontSize: 14, color: '#3a485b', fontWeight: 600 }}>Normal (neutral)</span>
              <span style={{ fontSize: 13, color: '#3a485b' }}>Waiting &lt; 5 minutes</span>
            </div>
          </div>
        </section>

        {/* Session */}
        <section style={{ background: '#ffffff', borderRadius: 12, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #dbc2b0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ color: '#8d4b00' }}>account_circle</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111c2d', margin: 0 }}>Session</h2>
          </div>
          <p style={{ fontSize: 14, color: '#554336', marginBottom: 16 }}>Sign out to switch accounts or branches.</p>
          <button type="button" onClick={logout} className="waiter-logout-button" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Sign Out
          </button>
        </section>
      </main>
    </div>
  );
}
