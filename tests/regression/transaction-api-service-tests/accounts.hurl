# Accounts list — auth required
GET {{base_url}}/api/accounts
Authorization: Bearer {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" exists
jsonpath "$.pagination" exists

# Capture first account id from list
GET {{base_url}}/api/accounts
Authorization: Bearer {{access_token}}
HTTP 200
[Captures]
first_acc_id: jsonpath "$.data[0].account_id"

# Single account by id
GET {{base_url}}/api/accounts/{{first_acc_id}}
Authorization: Bearer {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" exists
