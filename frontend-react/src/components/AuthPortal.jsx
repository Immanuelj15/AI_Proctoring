import React, { useState } from 'react';

export default function AuthPortal({ onLogin, onRegister }) {
  const [activeTab, setActiveTab] = useState('student-login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('student');

  const handleLoginSubmit = (e, expectedRole) => {
    e.preventDefault();
    onLogin(email, password, expectedRole);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    onRegister(regName, regEmail, regPassword, regRole);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div class="glass-card">
        {/* Separate Login & Register Tabs */}
        <div class="tab-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem' }}>
          <button
            class={`tab-btn ${activeTab === 'student-login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('student-login'); setEmail(''); setPassword(''); }}
            style={{ fontSize: '0.8rem', padding: '0.65rem 0.2rem' }}
          >
            🎓 Student
          </button>
          <button
            class={`tab-btn ${activeTab === 'examiner-login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('examiner-login'); setEmail(''); setPassword(''); }}
            style={{ fontSize: '0.8rem', padding: '0.65rem 0.2rem' }}
          >
            📝 Examiner
          </button>
          <button
            class={`tab-btn ${activeTab === 'admin-login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('admin-login'); setEmail(''); setPassword(''); }}
            style={{ fontSize: '0.8rem', padding: '0.65rem 0.2rem' }}
          >
            🔑 Admin
          </button>
          <button
            class={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
            style={{ fontSize: '0.8rem', padding: '0.65rem 0.2rem' }}
          >
            👤 Register
          </button>
        </div>

        {/* 1. Student Login Portal */}
        {activeTab === 'student-login' && (
          <form onSubmit={(e) => handleLoginSubmit(e, 'student')}>
            <div class="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 class="card-title">Student Portal Sign In</h2>
                <p class="card-description">Access your scheduled examinations and result history.</p>
              </div>
              <span class="status-badge" style={{ background: 'rgba(37, 99, 235, 0.15)', color: 'var(--primary-blue)' }}>STUDENT</span>
            </div>

            <div class="form-group">
              <label class="form-label" htmlFor="student-email">Student Email Address</label>
              <input
                type="email"
                id="student-email"
                class="form-input"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" htmlFor="student-password">Password</label>
              <input
                type="password"
                id="student-password"
                class="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" class="btn btn-primary">
              Sign In as Student
            </button>
          </form>
        )}

        {/* 2. Examiner Login Portal */}
        {activeTab === 'examiner-login' && (
          <form onSubmit={(e) => handleLoginSubmit(e, 'examiner')}>
            <div class="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 class="card-title">Examiner Portal Sign In</h2>
                <p class="card-description">Manage question banks, create exams, and grade responses.</p>
              </div>
              <span class="status-badge" style={{ background: 'rgba(2, 132, 199, 0.15)', color: 'var(--accent-sky)' }}>EXAMINER</span>
            </div>

            <div class="form-group">
              <label class="form-label" htmlFor="examiner-email">Examiner Email Address</label>
              <input
                type="email"
                id="examiner-email"
                class="form-input"
                placeholder="examiner@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" htmlFor="examiner-password">Password</label>
              <input
                type="password"
                id="examiner-password"
                class="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" class="btn btn-primary" style={{ background: 'linear-gradient(135deg, #0284c7, #1e3a8a)' }}>
              Sign In as Examiner
            </button>
          </form>
        )}

        {/* 3. Admin Login Portal */}
        {activeTab === 'admin-login' && (
          <form onSubmit={(e) => handleLoginSubmit(e, 'admin')}>
            <div class="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 class="card-title">Admin Portal Sign In</h2>
                <p class="card-description">System administration, user access, and proctor logs.</p>
              </div>
              <span class="status-badge" style={{ background: 'rgba(127, 0, 255, 0.15)', color: '#7f00ff' }}>ADMIN</span>
            </div>

            <div class="form-group">
              <label class="form-label" htmlFor="admin-email">Admin Email Address</label>
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
              <label class="form-label" htmlFor="admin-password">Password</label>
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

            <button type="submit" class="btn btn-primary" style={{ background: 'linear-gradient(135deg, #4f46e5, #1e1b4b)' }}>
              Sign In as Administrator
            </button>
          </form>
        )}

        {/* 4. Register Portal */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            <div class="card-header">
              <h2 class="card-title">Create Account</h2>
              <p class="card-description">Register a new user account on the examination platform.</p>
            </div>

            <div class="form-group">
              <label class="form-label" htmlFor="reg-name">Full Name</label>
              <input
                type="text"
                id="reg-name"
                class="form-input"
                placeholder="John Doe"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" htmlFor="reg-email">Email Address</label>
              <input
                type="email"
                id="reg-email"
                class="form-input"
                placeholder="john@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" htmlFor="reg-password">Password</label>
              <input
                type="password"
                id="reg-password"
                class="form-input"
                placeholder="Minimum 6 characters"
                minLength="6"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Select Account Role</label>
              <div class="role-options">
                <div>
                  <input
                    type="radio"
                    id="role-student"
                    name="reg-role"
                    value="student"
                    class="role-radio"
                    checked={regRole === 'student'}
                    onChange={(e) => setRegRole(e.target.value)}
                  />
                  <label htmlFor="role-student" class="role-label">Student</label>
                </div>
                <div>
                  <input
                    type="radio"
                    id="role-examiner"
                    name="reg-role"
                    value="examiner"
                    class="role-radio"
                    checked={regRole === 'examiner'}
                    onChange={(e) => setRegRole(e.target.value)}
                  />
                  <label htmlFor="role-examiner" class="role-label">Examiner</label>
                </div>
                <div>
                  <input
                    type="radio"
                    id="role-admin"
                    name="reg-role"
                    value="admin"
                    class="role-radio"
                    checked={regRole === 'admin'}
                    onChange={(e) => setRegRole(e.target.value)}
                  />
                  <label htmlFor="role-admin" class="role-label">Admin</label>
                </div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary">
              Register Account
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
