package com.transacto.transactionapi.service;

import tools.jackson.databind.ObjectMapper;
import com.transacto.transactionapi.dto.*;
import com.transacto.transactionapi.entity.Account;
import com.transacto.transactionapi.repository.AccountRepository;
import com.transacto.transactionapi.repository.ProcessedEventRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class TransactionApiService {

    private final AccountRepository accountRepository;
    private final ProcessedEventRepository eventRepository;
    private final ObjectMapper objectMapper;

    public TransactionApiService(AccountRepository accountRepository,
                                  ProcessedEventRepository eventRepository,
                                  ObjectMapper objectMapper) {
        this.accountRepository = accountRepository;
        this.eventRepository = eventRepository;
        this.objectMapper = objectMapper;
    }

    public PaginatedResponse<TransactionResponse> getTransactions(
            String transactionId, String sourceAccountId, String destinationAccountId,
            String accountId, String currency, BigDecimal minAmount, BigDecimal maxAmount,
            String fromDate, String toDate, int page, int limit, String sortBy, String sortOrder) {

        int offset = (page - 1) * limit;
        long total = eventRepository.countFilteredTransactions(
                transactionId, sourceAccountId, destinationAccountId, accountId,
                currency, minAmount, maxAmount, fromDate, toDate);

        List<Object[]> rows = eventRepository.findFilteredTransactions(
                transactionId, sourceAccountId, destinationAccountId, accountId,
                currency, minAmount, maxAmount, fromDate, toDate,
                sortBy, sortOrder, limit, offset);

        List<TransactionResponse> data = mapTransactions(rows);
        return new PaginatedResponse<>(data, page, limit, (int) total);
    }

    public TransactionResponse getTransactionById(String id) {
        List<Object[]> rows = eventRepository.findOneById(id);
        if (rows.isEmpty()) return null;
        return mapTransaction(rows.getFirst());
    }

    public PaginatedResponse<AccountResponse> getAccounts(
            String currency, String accountIdSearch, BigDecimal minBalance, BigDecimal maxBalance,
            int page, int limit, String sortBy, String sortOrder) {

        int offset = (page - 1) * limit;
        long total = accountRepository.countFiltered(currency, accountIdSearch, minBalance, maxBalance);

        List<Object[]> rows = accountRepository.findFiltered(
                currency, accountIdSearch, minBalance, maxBalance,
                sortBy, sortOrder, limit, offset);

        List<AccountResponse> data = mapAccounts(rows);
        return new PaginatedResponse<>(data, page, limit, (int) total);
    }

    public AccountResponse getAccountById(String accountId) {
        return accountRepository.findById(accountId)
                .map(this::mapAccount)
                .orElse(null);
    }

    public StatsResponse getStats() {
        long totalEvents = eventRepository.countAll();
        long totalAccounts = accountRepository.countAll();
        List<Object[]> volumeRows = eventRepository.findVolumeByCurrency();

        List<VolumeByCurrency> volume = new ArrayList<>();
        for (Object[] row : volumeRows) {
            String currency = (String) row[0];
            long txCount = ((Number) row[1]).longValue();
            BigDecimal totalVolume = (BigDecimal) row[2];
            volume.add(new VolumeByCurrency(currency, txCount, totalVolume));
        }

        StatsResponse stats = new StatsResponse();
        stats.setTotalEvents(totalEvents);
        stats.setTotalAccounts(totalAccounts);
        stats.setVolumeByCurrency(volume);
        return stats;
    }

    private List<TransactionResponse> mapTransactions(List<Object[]> rows) {
        List<TransactionResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(mapTransaction(row));
        }
        return result;
    }

    private TransactionResponse mapTransaction(Object[] row) {
        TransactionResponse t = new TransactionResponse();
        t.setEventId((String) row[0]);
        t.setTransactionId((String) row[1]);
        t.setEventType((String) row[2]);
        t.setEventTimestamp((String) row[3]);
        t.setTransactionIdInner((String) row[4]);
        t.setSourceAccountId((String) row[5]);
        t.setDestinationAccountId((String) row[6]);
        t.setAmount((BigDecimal) row[7]);
        t.setCurrency((String) row[8]);
        t.setDescription((String) row[9]);
        try {
            if (row[10] instanceof String s) {
                t.setRawEventFull(objectMapper.readTree(s));
            } else {
                t.setRawEventFull(row[10]);
            }
        } catch (Exception e) {
            t.setRawEventFull(row[10]);
        }
        t.setProcessedAt((Instant) row[11]);
        return t;
    }

    private List<AccountResponse> mapAccounts(List<Object[]> rows) {
        List<AccountResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            AccountResponse a = new AccountResponse();
            a.setAccountId((String) row[0]);
            a.setBalance((BigDecimal) row[1]);
            a.setCurrency((String) row[2]);
            a.setUpdatedAt((Instant) row[3]);
            result.add(a);
        }
        return result;
    }

    private AccountResponse mapAccount(Account a) {
        AccountResponse r = new AccountResponse();
        r.setAccountId(a.getAccountId());
        r.setBalance(a.getBalance());
        r.setCurrency(a.getCurrency());
        r.setUpdatedAt(a.getUpdatedAt());
        return r;
    }
}
