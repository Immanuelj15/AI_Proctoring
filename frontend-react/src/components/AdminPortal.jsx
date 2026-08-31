import React, { useState } from 'react';

export default function AdminPortal({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password, 'admin');
  };

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <div class="glass-card" style={{ borderTop: '4px solid #7f00ff' }}>
        
        <div class="card-header" style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #7f00ff, #1e1b4b)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 4px 15px rgba(127, 0, 255, 0.3)',
            fontSize: '1.5rem',
            color: '#ffffff'
          }}>
            🔒
          </div>
          <h2 class="card-title" style={{ justifyContent: 'center' }}>Administrator Portal</h2>
          <p class="card-description">Restricted system administration & security operations.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div class="form-group">
            <label class="form-label" htmlFor="admin-email">Administrator Email</label>
            <input
              type="email"
              id="admin-email"
              class="form-input"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" htmlFor="admin-password">Administrator Password</label>
            <input
              type="password"
              id="admin-password"
              class="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" class="btn btn-primary" style={{ background: 'linear-gradient(135deg, #7f00ff, #1e1b4b)', marginTop: '1.5rem' }}>
            Authenticate Administrator
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
          <a href="/" style={{ color: 'var(--primary-blue)', textDecoration: 'none', fontWeight: '600' }}>
            ← Return to Public User Portal
          </a>
        </div>

      </div>
    </div>
  );
}
