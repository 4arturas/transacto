```sh
hurl --test --variables-file tests/regression/transaction-api-service-tests/variables.env --file-root . tests/regression/transaction-api-service-tests/run-all.hurl
```

### Test Node.js implementation (port 4000)

```sh
hurl --test --variable base_url=http://localhost:4000 --variable auth_url=http://localhost:3000/api/auth/login --variable auth_base=http://localhost:3000 --file-root . tests/regression/transaction-api-service-tests/run-all.hurl
```

## Test Structure

| File | Endpoints | Auth |
|------|-----------|------|
| `health.hurl` | `GET /health` | No |
| `stats.hurl` | `GET /api/stats` | Yes |
| `transactions.hurl` | `GET /api/transactions`, `GET /api/transactions/:id` | Yes |
| `accounts.hurl` | `GET /api/accounts`, `GET /api/accounts/:accountId` | Yes |
| `unauthorized.hurl` | `GET /api/stats` (no token) | 401 expected |
| `auth.hurl` | `POST /api/auth/login` | Captures token |
| `run-all.hurl` | All endpoints in sequence | Self-contained |

The `variables.env` file sets `base_url=http://localhost:1880` by default. Override with `--variable base_url=...` to target a different environment.
