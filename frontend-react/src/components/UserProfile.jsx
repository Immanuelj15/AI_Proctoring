import React from 'react';

export default function UserProfile({ user, onLogout }) {
  if (!user) return null;

  return (
    <div>
      <div class="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 class="card-title" style={{ fontSize: '1.6rem', color: 'var(--primary-blue)' }}>
            Hi, {user.name}! 👋
          </h2>
          <p class="card-description" style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
            Welcome back to your {user.role.toUpperCase()} Dashboard.
          </p>
        </div>
        <span class="status-badge" style={{ background: 'rgba(37, 99, 235, 0.15)', color: 'var(--primary-blue)', fontWeight: '700', fontSize: '0.85rem' }}>
          {user.role.toUpperCase()}
        </span>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--accent-ice)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', color: 'var(--primary-navy)' }}>
        <p><strong>Account Name:</strong> {user.name}</p>
        <p style={{ marginTop: '0.25rem' }}><strong>Email Address:</strong> {user.email}</p>
        <p style={{ marginTop: '0.25rem' }}><strong>User ID:</strong> #{user.id}</p>
        <p style={{ marginTop: '0.25rem' }}><strong>Account Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
      </div>

      <button class="btn btn-danger" onClick={onLogout}>
        Log Out Session
      </button>
    </div>
  );
}
