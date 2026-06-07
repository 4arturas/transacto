# Regression test suite for User Service
# Run: hurl --test --file-root . ./tests/user-service-tests/run-all.hurl

# Step 1: health
GET {{base_url}}/health
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"

# Step 2: login as admin
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
jsonpath "$.user.role" == "admin"

# Step 3: current user profile
GET {{base_url}}/api/me
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
jsonpath "$.user.email" == "admin@example.com"
jsonpath "$.user.role" == "admin"

# Step 4: list users
GET {{base_url}}/api/users
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
jsonpath "$.data" exists
jsonpath "$.pagination" exists

# Step 5: create user
POST {{base_url}}/api/users
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "email": "regression-test@example.com",
    "password": "testpass123",
    "role": "user"
}
HTTP 201
[Captures]
new_user_id: jsonpath "$.user.id"
[Asserts]
jsonpath "$.user.email" == "regression-test@example.com"
jsonpath "$.user.role" == "user"

# Step 6: get user by id
GET {{base_url}}/api/users/{{new_user_id}}
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
jsonpath "$.user.id" == "{{new_user_id}}"
jsonpath "$.user.email" == "regression-test@example.com"

# Step 7: login as created user (non-admin)
POST {{base_url}}/api/login
Content-Type: application/json
{
    "email": "regression-test@example.com",
    "password": "testpass123"
}
HTTP 200
[Captures]
user_token: jsonpath "$.accessToken"

# Step 8: non-admin → 403 on admin endpoints
GET {{base_url}}/api/users
Authorization: Bearer {{user_token}}
HTTP 403
[Asserts]
jsonpath "$.error" exists

# Step 9: change role to admin
PUT {{base_url}}/api/users/{{new_user_id}}/role
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "role": "admin"
}
HTTP 200
[Asserts]
jsonpath "$.user.role" == "admin"

# Step 10: delete user
DELETE {{base_url}}/api/users/{{new_user_id}}
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
jsonpath "$.message" == "User deleted"

# Step 11: verify deletion
GET {{base_url}}/api/users/{{new_user_id}}
Authorization: Bearer {{admin_token}}
HTTP 404
[Asserts]
jsonpath "$.error" exists

# Step 12: no token → 401
GET {{base_url}}/api/me
HTTP 401
[Asserts]
jsonpath "$.error" exists
