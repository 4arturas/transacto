# Protected endpoint without token — must return 401
GET {{base_url}}/api/me
HTTP 401
[Asserts]
jsonpath "$.error" exists

# Admin endpoint with non-admin token — must return 403
# First login as regular user
POST {{base_url}}/api/login
Content-Type: application/json
{
    "email": "alice@example.com",
    "password": "secret123"
}
HTTP 200
[Captures]
user_token: jsonpath "$.accessToken"

GET {{base_url}}/api/users
Authorization: Bearer {{user_token}}
HTTP 403
[Asserts]
jsonpath "$.error" exists
