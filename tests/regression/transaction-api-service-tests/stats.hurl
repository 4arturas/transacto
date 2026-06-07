# Stats endpoint — auth required
GET {{base_url}}/api/stats
Authorization: Bearer {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.total_events" exists
jsonpath "$.total_accounts" exists
jsonpath "$.volume_by_currency" exists
