package com.transacto.transactionapi.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class TransactionResponse {

    private String eventId;
    private String transactionId;
    private String eventType;
    private String eventTimestamp;
    private String transactionIdInner;
    private String sourceAccountId;
    private String destinationAccountId;
    private BigDecimal amount;
    private String currency;
    private String description;
    private Object rawEventFull;
    private Instant processedAt;

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getEventTimestamp() { return eventTimestamp; }
    public void setEventTimestamp(String eventTimestamp) { this.eventTimestamp = eventTimestamp; }
    public String getTransactionIdInner() { return transactionIdInner; }
    public void setTransactionIdInner(String transactionIdInner) { this.transactionIdInner = transactionIdInner; }
    public String getSourceAccountId() { return sourceAccountId; }
    public void setSourceAccountId(String sourceAccountId) { this.sourceAccountId = sourceAccountId; }
    public String getDestinationAccountId() { return destinationAccountId; }
    public void setDestinationAccountId(String destinationAccountId) { this.destinationAccountId = destinationAccountId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Object getRawEventFull() { return rawEventFull; }
    public void setRawEventFull(Object rawEventFull) { this.rawEventFull = rawEventFull; }
    public Instant getProcessedAt() { return processedAt; }
    public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }
}
