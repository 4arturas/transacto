# Login and capture access token (required by all protected endpoints)
POST http://localhost:3000/api/auth/login
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

