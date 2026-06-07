```sh
hurl --test --variables-file .\\\\tests\\\\user-service-tests\\\\variables.env --file-root . .\\\\tests\\\\user-service-tests\\\\run-all.hurl
```

```sh
hurl --test --variable base_url=http://localhost:3100 --file-root . tests/regression/user-service-tests/run-all.hurl
```

## Test Structure

| File | Endpoints | Auth |
|------|----------|------|
| `health.hurl` | `GET /health` | No |
| `login.hurl` | `POST /api/login` | No |
| `me.hurl` | `GET /api/me` | Bearer token |
| `users-crud.hurl` | `GET /api/users`, `POST /api/users`, `GET /api/users/:id`, `PUT /api/users/:id/role`, `DELETE /api/users/:id` | Admin |
| `unauthorized.hurl` | `GET /api/me` (no token), `GET /api/users` (non-admin) | 401 / 403 |
| `run-all.hurl` | All endpoints in sequence | Self-contained |

Default credentials: `admin@example.com` / `admin123`
