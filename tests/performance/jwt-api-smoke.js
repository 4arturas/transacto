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

const API_BASE = __ENV.API_BASE || 'http://localhost:3000';

export default function () {
  http.post(`${API_BASE}/api/auth/register`, JSON.stringify({
    email: 'k6-test@example.com',
    password: 'testpass123',
  }), { headers: { 'Content-Type': 'application/json' } });

  const token = http.post(`${API_BASE}/api/auth/login`, JSON.stringify({
    email: 'k6-test@example.com',
    password: 'testpass123',
  }), { headers: { 'Content-Type': 'application/json' } }).json().accessToken;

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  group('health', () => {
    const r = http.get(`${API_BASE}/health`);
    check(r, { 'health ok': (r) => r.status === 200 });
    errorRate.add(r.status !== 200);
  });

  group('me', () => {
    const r = http.get(`${API_BASE}/api/auth/me`, { headers });
    check(r, { 'me ok': (r) => r.status === 200 });
    errorRate.add(r.status !== 200);
  });

  group('login', () => {
    const r = http.post(`${API_BASE}/api/auth/login`, JSON.stringify({
      email: 'k6-test@example.com',
      password: 'testpass123',
    }), { headers: { 'Content-Type': 'application/json' } });
    check(r, { 'login ok': (r) => r.status === 200 });
    errorRate.add(r.status !== 200);
  });

  sleep(1);
}
