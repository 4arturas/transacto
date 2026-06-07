import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.10'],
    http_req_duration: ['p(95)<5000'],
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

  const endpoints = [
    `${API_BASE}/health`,
    `${API_BASE}/api/stats`,
    `${API_BASE}/api/transactions`,
    `${API_BASE}/api/accounts`,
  ];

  for (const url of endpoints) {
    const isHealth = url.endsWith('/health');
    const r = http.get(url, isHealth ? {} : { headers });
    check(r, { [`${url} ok`]: (r) => r.status === 200 });
    errorRate.add(r.status !== 200);
  }

  sleep(1);
}
