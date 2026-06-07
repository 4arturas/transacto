# Login as admin — captures access token for subsequent requests
POST {{base_url}}/api/login
Content-Type: application/json
{
    "email": "admin@example.com",
    "password": "admin123"
}
HTTP 200
[Captures]
admin_token: jsonpath "$.accessToken"
[Asserts]
jsonpath "$.accessToken" exists
jsonpath "$.user" exists
jsonpath "$.user.role" == "admin"
