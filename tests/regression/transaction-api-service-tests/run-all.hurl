# Regression test suite for Transaction API Prototype (Node-RED)
# Run: hurl --test --variable access_token=<token> tests/*.hurl
# Or with auth chaining: hurl --test --file-root . tests/run-all.hurl

# Step 0: ensure test user exists (failsafe — ignores 409 if already registered)
POST {{auth_base}}/api/auth/register
Content-Type: application/json
{
    "email": "alice@example.com",
    "password": "secret123"
}

# Step 1: auth
POST {{auth_url}}
Content-Type: application/json
{
    "email": "alice@example.com",
    "password": "secret123"
}
HTTP 200
[Captures]
access_token: jsonpath "$.accessToken"
[Asserts]
jsonpath "$.accessToken" exists

# Step 2: health (no auth)
GET {{base_url}}/health
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"

# Step 3: stats
GET {{base_url}}/api/stats
Authorization: Bearer {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.total_events" exists
jsonpath "$.total_accounts" exists
jsonpath "$.volume_by_currency" exists

# Step 4: transactions
GET {{base_url}}/api/transactions
Authorization: Bearer {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" exists
jsonpath "$.pagination" exists

# Step 5: transaction detail — capture real id from list
GET {{base_url}}/api/transactions
Authorization: Bearer {{access_token}}
HTTP 200
[Captures]
first_tx_id: jsonpath "$.data[0].event_id"

GET {{base_url}}/api/transactions/{{first_tx_id}}
Authorization: Bearer {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" exists

# Step 6: accounts
GET {{base_url}}/api/accounts
Authorization: Bearer {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" exists
jsonpath "$.pagination" exists

# Step 7: account detail — capture real id from list
GET {{base_url}}/api/accounts
Authorization: Bearer {{access_token}}
HTTP 200
[Captures]
first_acc_id: jsonpath "$.data[0].account_id"

GET {{base_url}}/api/accounts/{{first_acc_id}}
Authorization: Bearer {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" exists

# Step 8: unauthorized access
GET {{base_url}}/api/stats
HTTP 401
[Asserts]
jsonpath "$.error" exists
