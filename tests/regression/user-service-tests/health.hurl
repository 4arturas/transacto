# Health endpoint — no auth required
GET {{base_url}}/health
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
