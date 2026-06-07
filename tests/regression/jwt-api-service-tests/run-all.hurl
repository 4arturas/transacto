# Regression test suite for JWT API Service
# Run: hurl --test --file-root . ./tests/jwt-api-service-tests/run-all.hurl

# Step 1: health
GET {{base_url}}/health
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"

# Step 2: register new user
POST {{base_url}}/api/auth/register
Content-Type: application/json
{
    "email": "jwt-test@example.com",
    "password": "testpass123"
}
HTTP 201
[Asserts]
jsonpath "$.user.email" == "jwt-test@example.com"
jsonpath "$.user.role" == "user"

# Step 3: register duplicate (idempotent check)
POST {{base_url}}/api/auth/register
Content-Type: application/json
{
    "email": "jwt-test@example.com",
    "password": "testpass123"
}
HTTP 400
[Asserts]
jsonpath "$.error" exists

# Step 4: login
POST {{base_url}}/api/auth/login
Content-Type: application/json
{
    "email": "jwt-test@example.com",
    "password": "testpass123"
}
HTTP 200
[Captures]
access_token: jsonpath "$.accessToken"
refresh_token: cookie "refresh_token"
[Asserts]
jsonpath "$.accessToken" exists
jsonpath "$.user.email" == "jwt-test@example.com"

# Step 5: login with wrong password
POST {{base_url}}/api/auth/login
Content-Type: application/json
{
    "email": "jwt-test@example.com",
    "password": "wrongpass"
}
HTTP 401
[Asserts]
jsonpath "$.error" exists

# Step 6: get current user with valid token
GET {{base_url}}/api/auth/me
Authorization: Bearer {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.user.email" == "jwt-test@example.com"
jsonpath "$.user.role" == "user"

# Step 7: get current user without token
GET {{base_url}}/api/auth/me
HTTP 401
[Asserts]
jsonpath "$.error" exists

# Step 8: refresh token
POST {{base_url}}/api/auth/refresh
Cookie: refresh_token={{refresh_token}}
HTTP 200
[Asserts]
jsonpath "$.accessToken" exists

# Step 9: refresh without cookie
POST {{base_url}}/api/auth/refresh
HTTP 401
[Asserts]
jsonpath "$.error" exists

# Step 10: invalid email format
POST {{base_url}}/api/auth/register
Content-Type: application/json
{
    "email": "not-an-email",
    "password": "testpass123"
}
HTTP 400
[Asserts]
jsonpath "$.error" exists

# Step 11: short password
POST {{base_url}}/api/auth/register
Content-Type: application/json
{
    "email": "shortpw@example.com",
    "password": "123"
}
HTTP 400
[Asserts]
jsonpath "$.error" exists