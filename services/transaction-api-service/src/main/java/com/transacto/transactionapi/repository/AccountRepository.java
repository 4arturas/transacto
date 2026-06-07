package com.transacto.transactionapi.repository;

import com.transacto.transactionapi.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface AccountRepository extends JpaRepository<Account, String> {

    @Query(value = """
        SELECT account_id, balance, currency, updated_at
        FROM accounts
        WHERE (:currency IS NULL OR currency = :currency)
          AND (:accountIdSearch IS NULL OR account_id ILIKE '%' || :accountIdSearch || '%')
          AND (:minBalance IS NULL OR balance >= :minBalance)
          AND (:maxBalance IS NULL OR balance <= :maxBalance)
        ORDER BY
            CASE WHEN :sortBy = 'account_id' AND :sortOrder = 'desc' THEN account_id END DESC,
            CASE WHEN :sortBy = 'account_id' AND :sortOrder != 'desc' THEN account_id END ASC,
            CASE WHEN :sortBy = 'balance' AND :sortOrder = 'desc' THEN balance END DESC,
            CASE WHEN :sortBy = 'balance' AND :sortOrder != 'desc' THEN balance END ASC,
            CASE WHEN :sortBy = 'currency' AND :sortOrder = 'desc' THEN currency END DESC,
            CASE WHEN :sortBy = 'currency' AND :sortOrder != 'desc' THEN currency END ASC,
            CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN updated_at END DESC,
            CASE WHEN :sortBy = 'updated_at' AND :sortOrder != 'desc' THEN updated_at END ASC,
            updated_at DESC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<Object[]> findFiltered(
        @Param("currency") String currency,
        @Param("accountIdSearch") String accountIdSearch,
        @Param("minBalance") BigDecimal minBalance,
        @Param("maxBalance") BigDecimal maxBalance,
        @Param("sortBy") String sortBy,
        @Param("sortOrder") String sortOrder,
        @Param("limit") int limit,
        @Param("offset") int offset
    );

    @Query(value = """
        SELECT COUNT(*)
        FROM accounts
        WHERE (:currency IS NULL OR currency = :currency)
          AND (:accountIdSearch IS NULL OR account_id ILIKE '%' || :accountIdSearch || '%')
          AND (:minBalance IS NULL OR balance >= :minBalance)
          AND (:maxBalance IS NULL OR balance <= :maxBalance)
        """, nativeQuery = true)
    long countFiltered(
        @Param("currency") String currency,
        @Param("accountIdSearch") String accountIdSearch,
        @Param("minBalance") BigDecimal minBalance,
        @Param("maxBalance") BigDecimal maxBalance
    );

    @Query(value = "SELECT COUNT(*) FROM accounts", nativeQuery = true)
    long countAll();
}
