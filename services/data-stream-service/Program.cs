using System.Text.Json;
using Confluent.Kafka;

var topic = Env("KAFKA_TOPIC", "raw-transactions");
var clientId = Env("KAFKA_CLIENT_ID", "data-stream-simulator");
var brokers = Env("KAFKA_BROKERS", "localhost:9092");
var intervalSec = int.Parse(Env("KAFKA_PUBLISH_INTERVAL_SECONDS", "10"));

var currencyOptions = new[] { "EUR", "DKK", "USD" };
var descriptionOptions = new[]
{
    "Salary payment", "Grocery Store", "Utility Bill", "Coffee Shop",
    "Restaurant", "Subscription Renewal", "Online Purchase",
    "Invoice Payment", "Taxi Ride", "Rent Payment",
};
var sourcePrefixes = new[] { "ACC-DK", "ACC-LT", "ACC-EE", "ACC-SE" };
var destinationPrefixes = new[] { "ACC-LT", "ACC-DK", "ACC-EE", "ACC-FI" };

var rand = new Random();
var shutdown = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    shutdown.Cancel();
};

using var producer = new ProducerBuilder<string, string>(
    new ProducerConfig { BootstrapServers = brokers, ClientId = clientId }
).Build();

Console.WriteLine($"Connected to Kafka brokers: {brokers}");
Console.WriteLine($"Producing events to topic: {topic}");

try
{
    while (!shutdown.Token.IsCancellationRequested)
    {
        await SendTransaction(producer, topic);

        var delay = TimeSpan.FromSeconds(intervalSec);
        Console.WriteLine($"Waiting {delay.TotalSeconds} s before next transaction...");
        await Task.Delay(delay, shutdown.Token);
    }
}
catch (OperationCanceledException) { }
finally
{
    producer.Flush(shutdown.Token.IsCancellationRequested ? TimeSpan.FromSeconds(5) : TimeSpan.FromSeconds(30));
    Console.WriteLine("Shutdown complete.");
}

static string Env(string key, string fallback) =>
    Environment.GetEnvironmentVariable(key) ?? fallback;

string RandomDigits(int length) =>
    string.Concat(Enumerable.Range(0, length).Select(_ => rand.Next(10)));

string RandomItem(string[] items) => items[rand.Next(items.Length)];

TransactionEvent BuildEvent()
{
    var source = $"{RandomItem(sourcePrefixes)}-{RandomDigits(8)}";
    string dest;
    do { dest = $"{RandomItem(destinationPrefixes)}-{RandomDigits(8)}"; }
    while (dest == source);

    return new TransactionEvent
    {
        EventId = $"evt_{Guid.NewGuid()}",
        EventType = "TRANSACTION_POSTED",
        Timestamp = DateTime.UtcNow.ToString("O"),
        Payload = new Payload
        {
            TransactionId = $"tx_{Guid.NewGuid().ToString("N")[..10]}",
            SourceAccountId = source,
            DestinationAccountId = dest,
            Amount = (decimal)Math.Round(5 + rand.NextDouble() * 4995, 2),
            Currency = RandomItem(currencyOptions),
            Description = RandomItem(descriptionOptions),
        }
    };
}

async Task SendTransaction(IProducer<string, string> prod, string t)
{
    var evt = BuildEvent();
    var json = JsonSerializer.Serialize(evt);

    var result = await prod.ProduceAsync(t, new Message<string, string>
    {
        Key = evt.Payload.SourceAccountId,
        Value = json,
    }, shutdown.Token);

    Console.WriteLine("---");
    Console.WriteLine($"Kafka topic: {t}");
    Console.WriteLine($"Message key: {evt.Payload.SourceAccountId}");
    Console.WriteLine($"Payload:\n{JsonSerializer.Serialize(evt)}");
    Console.WriteLine($"Partition: {result.Partition}, Offset: {result.Offset}");
}

record TransactionEvent
{
    public string EventId { get; init; } = "";
    public string EventType { get; init; } = "";
    public string Timestamp { get; init; } = "";
    public Payload Payload { get; init; } = new();
}

record Payload
{
    public string TransactionId { get; init; } = "";
    public string SourceAccountId { get; init; } = "";
    public string DestinationAccountId { get; init; } = "";
    public decimal Amount { get; init; }
    public string Currency { get; init; } = "";
    public string Description { get; init; } = "";
}

