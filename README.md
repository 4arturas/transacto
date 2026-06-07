```sh
docker compose up --build
````

Admin: admin@example.com / admin123
Regular user: alice@example.com / secret123


```sh
curl -X POST http://localhost:1880/flow -H "Content-Type: application/json" -d @node-red-flows.json
````