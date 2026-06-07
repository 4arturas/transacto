import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const latency = new Trend('latency');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

const API_BASE = __ENV.API_BASE || 'http://localhost:1880';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3000/api/auth/login';

function login() {
  const res = http.post(AUTH_URL, JSON.stringify({
    email: 'alice@example.com',
    password: 'secret123',
  }), { headers: { 'Content-Type': 'application/json' } });
  return res.json().accessToken;
}

export default function () {
  const token = login();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  group('health', () => {
    const r = http.get(`${API_BASE}/health`);
    check(r, { 'health ok': (r) => r.status === 200 });
    latency.add(r.timings.duration);
    errorRate.add(r.status !== 200);
  });

  group('stats', () => {
    const r = http.get(`${API_BASE}/api/stats`, { headers });
    check(r, { 'stats ok': (r) => r.status === 200 });
    latency.add(r.timings.duration);
    errorRate.add(r.status !== 200);
  });

  group('transactions', () => {
    const r = http.get(`${API_BASE}/api/transactions`, { headers });
    check(r, { 'txns ok': (r) => r.status === 200 });
    latency.add(r.timings.duration);
    errorRate.add(r.status !== 200);
  });

  group('accounts', () => {
    const r = http.get(`${API_BASE}/api/accounts`, { headers });
    check(r, { 'accts ok': (r) => r.status === 200 });
    latency.add(r.timings.duration);
    errorRate.add(r.status !== 200);
  });

  sleep(1);
}
