I am applying for the job position described in `job-posting.md`.

I have never worked as an architect officially, but I want to apply. They are looking for an architect with a change mindset. So what can I offer them?

I am a software developer. At my current workplace, architects give me very dry diagrams drawn in Draw.io or similar tools. The diagrams are never complete — they always need finishing. Sometimes there is no diagram at all. My way of dealing with this is to build a working prototype **before** starting the implementation. For that I use Node-RED. Working prototypes call existing APIs, create new APIs, and communicate with message brokers. I want to build a demo solution to show them.

This solution belongs to an imaginary company called **Transacto**, and I am going to present it to them.

---

## The Project: "The Ledger Bridge" (Core Banking Event-Driven Aggregator)

The Digital Core tribe at Danske Bank focuses on moving from legacy systems to a modern, event-driven microservices architecture. I built a mini-ecosystem that simulates exactly that.

### The Scenario

A legacy banking system dumps raw, unvalidated financial transaction streams into Kafka. The system must securely authorize users, process those financial events, aggregate account balances, and store them reliably.

---

I have been given the task to create `transaction-api-service`, which does not exist yet. My plan is to:

1. Build a "Transaction API Prototype" in Node-RED
2. Show it to my leader
3. Make changes if needed
4. Once approved, hand it over to developers for implementation

The Node-RED diagrams need to be easy to understand.

*Maybe you can suggest alternative visual programming tools — besides Node-RED — that would help architects and developers communicate better.*