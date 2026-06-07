package com.transacto.transactionapi.repository;

import com.transacto.transactionapi.entity.ProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, String> {

    String SELECT_COLUMNS = """
        event_id,
        transaction_id,
        raw_event->>'eventType' AS event_type,
        raw_event->>'timestamp' AS event_timestamp,
        raw_event->'payload'->>'transactionId' AS transaction_id_inner,
        raw_event->'payload'->>'sourceAccountId' AS source_account_id,
        raw_event->'payload'->>'destinationAccountId' AS destination_account_id,
        (raw_event->'payload'->>'amount')::numeric AS amount,
        raw_event->'payload'->>'currency' AS currency,
        raw_event->'payload'->>'description' AS description,
        raw_event AS raw_event_full,
        processed_at
    """;

    @Query(value = """
        SELECT """ + SELECT_COLUMNS + """
        FROM processed_events
        WHERE (:transactionId IS NULL OR raw_event->'payload'->>'transactionId' = :transactionId)
          AND (:sourceAccountId IS NULL OR raw_event->'payload'->>'sourceAccountId' = :sourceAccountId)
          AND (:destinationAccountId IS NULL OR raw_event->'payload'->>'destinationAccountId' = :destinationAccountId)
          AND (:accountId IS NULL OR raw_event->'payload'->>'sourceAccountId' = :accountId
               OR raw_event->'payload'->>'destinationAccountId' = :accountId)
          AND (:currency IS NULL OR raw_event->'payload'->>'currency' = :currency)
          AND (:minAmount IS NULL OR (raw_event->'payload'->>'amount')::numeric >= :minAmount)
          AND (:maxAmount IS NULL OR (raw_event->'payload'->>'amount')::numeric <= :maxAmount)
          AND (:fromDate IS NULL OR processed_at >= :fromDate::timestamptz)
          AND (:toDate IS NULL OR processed_at <= :toDate::timestamptz)
        ORDER BY
            CASE WHEN :sortBy = 'processed_at' AND :sortOrder = 'desc' THEN processed_at END DESC,
            CASE WHEN :sortBy = 'processed_at' AND :sortOrder != 'desc' THEN processed_at END ASC,
            CASE WHEN :sortBy = 'amount' AND :sortOrder = 'desc' THEN (raw_event->'payload'->>'amount')::numeric END DESC,
            CASE WHEN :sortBy = 'amount' AND :sortOrder != 'desc' THEN (raw_event->'payload'->>'amount')::numeric END ASC,
            CASE WHEN :sortBy = 'event_timestamp' AND :sortOrder = 'desc' THEN raw_event->>'timestamp' END DESC,
            CASE WHEN :sortBy = 'event_timestamp' AND :sortOrder != 'desc' THEN raw_event->>'timestamp' END ASC,
            processed_at DESC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<Object[]> findFilteredTransactions(
        @Param("transactionId") String transactionId,
        @Param("sourceAccountId") String sourceAccountId,
        @Param("destinationAccountId") String destinationAccountId,
        @Param("accountId") String accountId,
        @Param("currency") String currency,
        @Param("minAmount") BigDecimal minAmount,
        @Param("maxAmount") BigDecimal maxAmount,
        @Param("fromDate") String fromDate,
        @Param("toDate") String toDate,
        @Param("sortBy") String sortBy,
        @Param("sortOrder") String sortOrder,
        @Param("limit") int limit,
        @Param("offset") int offset
    );

    @Query(value = """
        SELECT COUNT(*)
        FROM processed_events
        WHERE (:transactionId IS NULL OR raw_event->'payload'->>'transactionId' = :transactionId)
          AND (:sourceAccountId IS NULL OR raw_event->'payload'->>'sourceAccountId' = :sourceAccountId)
          AND (:destinationAccountId IS NULL OR raw_event->'payload'->>'destinationAccountId' = :destinationAccountId)
          AND (:accountId IS NULL OR raw_event->'payload'->>'sourceAccountId' = :accountId
               OR raw_event->'payload'->>'destinationAccountId' = :accountId)
          AND (:currency IS NULL OR raw_event->'payload'->>'currency' = :currency)
          AND (:minAmount IS NULL OR (raw_event->'payload'->>'amount')::numeric >= :minAmount)
          AND (:maxAmount IS NULL OR (raw_event->'payload'->>'amount')::numeric <= :maxAmount)
          AND (:fromDate IS NULL OR processed_at >= :fromDate::timestamptz)
          AND (:toDate IS NULL OR processed_at <= :toDate::timestamptz)
        """, nativeQuery = true)
    long countFilteredTransactions(
        @Param("transactionId") String transactionId,
        @Param("sourceAccountId") String sourceAccountId,
        @Param("destinationAccountId") String destinationAccountId,
        @Param("accountId") String accountId,
        @Param("currency") String currency,
        @Param("minAmount") BigDecimal minAmount,
        @Param("maxAmount") BigDecimal maxAmount,
        @Param("fromDate") String fromDate,
        @Param("toDate") String toDate
    );

    @Query(value = """
        SELECT """ + SELECT_COLUMNS + """
        FROM processed_events
        WHERE event_id = :id OR transaction_id = :id
        LIMIT 1
        """, nativeQuery = true)
    List<Object[]> findOneById(@Param("id") String id);

    @Query(value = "SELECT COUNT(*) FROM processed_events", nativeQuery = true)
    long countAll();

    @Query(value = """
        SELECT
            raw_event->'payload'->>'currency' AS currency,
            COUNT(*) AS tx_count,
            SUM((raw_event->'payload'->>'amount')::numeric) AS total_volume
        FROM processed_events
        GROUP BY raw_event->'payload'->>'currency'
        """, nativeQuery = true)
    List<Object[]> findVolumeByCurrency();
}
