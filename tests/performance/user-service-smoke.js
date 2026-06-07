import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: '58m', target: 20 },
    { duration: '0m', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.05'],
  },
};

const API_BASE = __ENV.API_BASE || 'http://localhost:3100';
const AUTH_URL = `${API_BASE}/api/login`;

function login() {
  const res = http.post(AUTH_URL, JSON.stringify({
    email: 'admin@example.com',
    password: 'admin123',
  }), { headers: { 'Content-Type': 'application/json' } });
  return res.json().accessToken;
}

export default function () {
  const token = login();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  group('health', () => {
    const r = http.get(`${API_BASE}/health`);
    check(r, { 'health ok': (r) => r.status === 200 });
    errorRate.add(r.status !== 200);
  });

  group('me', () => {
    const r = http.get(`${API_BASE}/api/me`, { headers });
    check(r, { 'me ok': (r) => r.status === 200 });
    errorRate.add(r.status !== 200);
  });

  group('users', () => {
    const r = http.get(`${API_BASE}/api/users`, { headers });
    check(r, { 'users ok': (r) => r.status === 200 });
    errorRate.add(r.status !== 200);
  });

  sleep(1);
}
