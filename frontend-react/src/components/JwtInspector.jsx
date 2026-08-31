import React from 'react';

export default function JwtInspector({ token }) {
  const parseJwt = (jwtToken) => {
    try {
      const base64Url = jwtToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return { error: 'Invalid JWT Token format' };
    }
  };

  const decoded = token ? parseJwt(token) : {};

  return (
    <div class="glass-card">
      <div class="card-header">
        <h2 class="card-title">JWT Token Inspector</h2>
        <p class="card-description">Live decoded JSON Web Token payload issued by FastAPI.</p>
      </div>

      <div class="form-group">
        <label class="form-label">Raw JWT Access Token (Bearer)</label>
        <div class="json-viewer" style={{ maxHeight: '100px', fontSize: '0.75rem', color: '#a7f3d0' }}>
          {token || '-'}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Decoded JWT Payload Claims</label>
        <pre class="json-viewer" style={{ maxHeight: '180px' }}>
          {JSON.stringify(decoded, null, 2)}
        </pre>
      </div>
    </div>
  );
}
