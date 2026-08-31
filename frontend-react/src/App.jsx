import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StudentExaminerPortal from './components/StudentExaminerPortal';
import AdminPortal from './components/AdminPortal';
import UserProfile from './components/UserProfile';
import JwtInspector from './components/JwtInspector';
import RoleTester from './components/RoleTester';
import { ApiService } from './services/api';

export default function App() {
  const [health, setHealth] = useState({ server: false, db: false });
  const [token, setToken] = useState(localStorage.getItem('auth_token') || null);
  const [user, setUser] = useState(null);
  const [alert, setAlert] = useState({ msg: '', type: '' });
  
  // Track current URL path (/ or /admin)
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    checkHealth();
    if (token) {
      loadUserProfile(token);
    }

    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const checkHealth = async () => {
    const res = await ApiService.checkHealth();
    setHealth(res);
  };

  const showAlert = (msg, type = 'error') => {
    setAlert({ msg, type });
    if (msg && type === 'success') {
      setTimeout(() => setAlert({ msg: '', type: '' }), 4000);
    }
  };

  const loadUserProfile = async (authToken) => {
    const res = await ApiService.getCurrentUser(authToken);
    if (res.ok) {
      setUser(res.data);
    } else {
      handleLogout();
      showAlert('Session expired. Please log in again.');
    }
  };

  const handleLogin = async (email, password, expectedRole) => {
    setAlert({ msg: '', type: '' });
    const res = await ApiService.login(email, password);
    if (res.ok && res.data.access_token) {
      const jwtToken = res.data.access_token;
      
      const userRes = await ApiService.getCurrentUser(jwtToken);
      if (userRes.ok) {
        const userObj = userRes.data;
        if (expectedRole && userObj.role !== expectedRole) {
          showAlert(`Account '${userObj.email}' is an ${userObj.role.toUpperCase()} account. Please use the ${userObj.role.toUpperCase()} Portal.`, 'error');
          return;
        }
        setToken(jwtToken);
        setUser(userObj);
        localStorage.setItem('auth_token', jwtToken);
        showAlert(`Welcome back, ${userObj.name}! Signed in as ${userObj.role.toUpperCase()}.`, 'success');
      }
    } else {
      showAlert(res.data.detail || 'Login failed. Invalid email or password.', 'error');
    }
  };

  const handleRegister = async (name, email, password, role) => {
    setAlert({ msg: '', type: '' });
    const res = await ApiService.register(name, email, password, role);
    if (res.ok) {
      showAlert(`User '${res.data.name}' registered as ${res.data.role.toUpperCase()}. Logging in...`, 'success');
      await handleLogin(email, password, role);
    } else {
      showAlert(res.data.detail || 'Registration failed.', 'error');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    showAlert('Logged out successfully.', 'success');
  };

  // Determine which portal view to render based on URL path
  const isAdminPath = currentPath.startsWith('/admin');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header health={health} />

      <main class="container">
        {alert.msg && (
          <div class={`alert-banner ${alert.type}`}>
            {alert.msg}
          </div>
        )}

        {!token || !user ? (
          isAdminPath ? (
            <AdminPortal onLogin={handleLogin} />
          ) : (
            <StudentExaminerPortal onLogin={handleLogin} onRegister={handleRegister} />
          )
        ) : (
          <div class="auth-grid">
            <div class="glass-card">
              <UserProfile user={user} onLogout={handleLogout} />
              <RoleTester token={token} />
            </div>
            <JwtInspector token={token} />
          </div>
        )}
      </main>

      <footer class="app-footer">
        AI-Based Intelligent Examination Platform &copy; 2026 — Role-Based Authentication System
      </footer>
    </div>
  );
}
