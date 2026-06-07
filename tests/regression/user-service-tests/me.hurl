# Current user profile — auth required
GET {{base_url}}/api/me
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
jsonpath "$.user" exists
jsonpath "$.user.email" == "admin@example.com"
jsonpath "$.user.role" == "admin"
