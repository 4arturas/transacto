# List users — admin required
GET {{base_url}}/api/users
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
jsonpath "$.data" exists
jsonpath "$.pagination" exists

# Create a new user
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

# Get user by id
GET {{base_url}}/api/users/{{new_user_id}}
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
jsonpath "$.user.id" == "{{new_user_id}}"
jsonpath "$.user.email" == "regression-test@example.com"

# Update user role
PUT {{base_url}}/api/users/{{new_user_id}}/role
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "role": "admin"
}
HTTP 200
[Asserts]
jsonpath "$.user.role" == "admin"

# Delete user
DELETE {{base_url}}/api/users/{{new_user_id}}
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
jsonpath "$.message" == "User deleted"

# Verify deletion
GET {{base_url}}/api/users/{{new_user_id}}
Authorization: Bearer {{admin_token}}
HTTP 404
[Asserts]
jsonpath "$.error" exists

# Cannot delete primary admin
DELETE {{base_url}}/api/users/{{new_user_id}}
Authorization: Bearer {{admin_token}}
HTTP 400
[Asserts]
jsonpath "$.error" exists
