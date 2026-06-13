package com.transacto.transactionapi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "processed_events")
public class ProcessedEvent {

    @Id
    @Column(name = "event_id")
    private String eventId;

    @Column(name = "transaction_id", nullable = false)
    private String transactionId;

    @Column(name = "raw_event", columnDefinition = "jsonb")
    private String rawEvent;

    @Column(name = "processed_at")
    private Instant processedAt;

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public String getRawEvent() { return rawEvent; }
    public void setRawEvent(String rawEvent) { this.rawEvent = rawEvent; }
    public Instant getProcessedAt() { return processedAt; }
    public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }
}
