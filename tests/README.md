# Regression Tests

| Test Suite | Service | Port | Run Command |
|---|---|---|---|
| [Transaction API](./transaction-api-service-tests/) | Node-RED prototype / Node.js impl. | 1880 / 4000 | `hurl --test --file-root . ./tests/transaction-api-service-tests/run-all.hurl` |
| [User Service](./user-service-tests/) | user-service | 3100 | `hurl --test --file-root . ./tests/user-service-tests/run-all.hurl` |

See each suite's README for details.
