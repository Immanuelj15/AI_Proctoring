import React from 'react';

export default function Header({ health }) {
  let statusClass = 'status-dot';
  let statusText = 'Checking Backend...';

  if (health.server && health.db) {
    statusClass = 'status-dot online';
    statusText = 'Backend Online (DB Connected)';
  } else if (health.server) {
    statusClass = 'status-dot';
    statusText = 'Backend Online (DB Offline)';
  } else {
    statusClass = 'status-dot offline';
    statusText = 'Backend Offline';
  }

  return (
    <header class="app-header">
      <div class="brand">
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div class="brand-logo">AI</div>
          <div>
            <h1 class="brand-title">Examination Platform</h1>
            <p class="brand-subtitle">Automated Proctoring & Performance Analysis</p>
          </div>
        </a>
      </div>
      <div class="header-status">
        <a href="/admin" class="status-badge" style={{ textDecoration: 'none', background: 'rgba(127, 0, 255, 0.1)', borderColor: 'rgba(127, 0, 255, 0.3)', color: '#7f00ff' }}>
          🔒 Admin Portal
        </a>
        <div class="status-badge">
          <span class={statusClass}></span>
          <span>{statusText}</span>
        </div>
      </div>
    </header>
  );
}
