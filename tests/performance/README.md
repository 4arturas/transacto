# Performance Tests

Uses [k6](https://k6.io) for load, stress, and soak testing.

## Install k6

**Windows (winget):**
```sh
winget install k6
```

**macOS:**
```sh
brew install k6
```

**Linux:**
```sh
sudo apt install k6
```

## Test Types

| Test | File | What it does |
|------|------|-------------|
| **Smoke** | `transaction-api-smoke.js` | 1 VU, 1 iteration — verify basic functionality |
| **Load** | `transaction-api-load.js` | Ramp to 30 VUs over 2 min — expected traffic |
| **Stress** | `transaction-api-stress.js` | Ramp to 300 VUs — find breaking point |
| **Smoke** | `user-service-smoke.js` | 1 VU, 1 iteration — verify user-api-service |
| **Load** | `user-service-load.js` | Ramp to 50 VUs over 2 min — expected traffic |

## Run

### Transaction API (default: Node-RED on port 1880)

```sh
k6 run .\\tests\\performance\\transaction-api-smoke.js
k6 run .\\tests\\performance\\transaction-api-stress.js
```

Target the Node.js implementation (port 4000):
```sh
k6 run -e API_BASE=http://localhost:4000 .\\tests\\performance\\transaction-api-load.js
```

### User Service (port 3100)

```sh
k6 run .\\tests\\performance\\user-service-smoke.js
k6 run .\\tests\\performance\\user-service-load.js
```

## Options

| Env var | Default | Description |
|---------|---------|-------------|
| `API_BASE` | `http://localhost:1880` or `http://localhost:3100` | Target base URL |
