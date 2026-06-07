# Transactions list — auth required
GET {{base_url}}/api/transactions
Authorization: Bearer {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" exists
jsonpath "$.pagination" exists

# Capture first transaction id from list
GET {{base_url}}/api/transactions
Authorization: Bearer {{access_token}}
HTTP 200
[Captures]
first_tx_id: jsonpath "$.data[0].event_id"

# Single transaction by id
GET {{base_url}}/api/transactions/{{first_tx_id}}
Authorization: Bearer {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" exists
