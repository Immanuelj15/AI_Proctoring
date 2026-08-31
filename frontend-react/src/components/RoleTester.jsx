import React, { useState } from 'react';
import { ApiService } from '../services/api';

export default function RoleTester({ token }) {
  const [testResult, setTestResult] = useState('// Click any test button above to verify RBAC access...');
  const [loading, setLoading] = useState(false);

  const runTest = async (role) => {
    setLoading(true);
    setTestResult(`Testing GET /users/${role}-test...`);

    const res = await ApiService.testRole(role, token);
    const resultObj = {
      http_status: res.status,
      access_granted: res.ok,
      response_data: res.data
    };
    setTestResult(JSON.stringify(resultObj, null, 2));
    setLoading(false);
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Role Permission Tester</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click to test protected FastAPI endpoints with your active JWT token:</p>

      <div class="test-btn-grid">
        <button class="btn-test" onClick={() => runTest('student')} disabled={loading}>
          Test Student
        </button>
        <button class="btn-test" onClick={() => runTest('examiner')} disabled={loading}>
          Test Examiner
        </button>
        <button class="btn-test" onClick={() => runTest('admin')} disabled={loading}>
          Test Admin
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <label class="form-label">RBAC Response Result</label>
        <pre class="json-viewer">{testResult}</pre>
      </div>
    </div>
  );
}
