# Protected endpoint without token — must return 401
GET {{base_url}}/api/stats
HTTP 401
[Asserts]
jsonpath "$.error" exists
