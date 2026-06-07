import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const API_BASE = __ENV.API_BASE || 'http://localhost:1880';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3000/api/auth/login';

function login() {
  const res = http.post(AUTH_URL, JSON.stringify({
    email: 'alice@example.com',
    password: 'secret123',
  }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'login ok': (r) => r.status === 200 });
  return res.json().accessToken;
}

export default function () {
  const token = login();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  group('health', () => {
    const r = http.get(`${API_BASE}/health`);
    check(r, { 'health status ok': (r) => r.json('status') === 'ok' });
    errorRate.add(r.status !== 200);
  });

  group('stats', () => {
    const r = http.get(`${API_BASE}/api/stats`, { headers });
    check(r, { 'stats total_events exists': (r) => r.json('total_events') !== undefined });
    errorRate.add(r.status !== 200);
  });

  group('transactions', () => {
    const r = http.get(`${API_BASE}/api/transactions`, { headers });
    check(r, { 'transactions data exists': (r) => r.json('data') !== undefined });
    errorRate.add(r.status !== 200);

    const data = r.json('data');
    if (data && data.length > 0) {
      const id = data[0].event_id;
      const rd = http.get(`${API_BASE}/api/transactions/${id}`, { headers });
      check(rd, { 'transaction detail ok': (r) => r.status === 200 });
    }
  });

  group('accounts', () => {
    const r = http.get(`${API_BASE}/api/accounts`, { headers });
    check(r, { 'accounts data exists': (r) => r.json('data') !== undefined });
    errorRate.add(r.status !== 200);

    const data = r.json('data');
    if (data && data.length > 0) {
      const id = data[0].account_id;
      const rd = http.get(`${API_BASE}/api/accounts/${id}`, { headers });
      check(rd, { 'account detail ok': (r) => r.status === 200 });
    }
  });

  sleep(1);
}
