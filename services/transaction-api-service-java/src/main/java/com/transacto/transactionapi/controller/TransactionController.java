package com.transacto.transactionapi.controller;

import com.transacto.transactionapi.dto.ErrorResponse;
import com.transacto.transactionapi.dto.PaginatedResponse;
import com.transacto.transactionapi.dto.TransactionResponse;
import com.transacto.transactionapi.service.TransactionApiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api")
public class TransactionController {

    private final TransactionApiService service;

    public TransactionController(TransactionApiService service) {
        this.service = service;
    }

    @GetMapping("/transactions")
    public ResponseEntity<PaginatedResponse<TransactionResponse>> listTransactions(
            @RequestParam(required = false) String transactionId,
            @RequestParam(required = false) String sourceAccountId,
            @RequestParam(required = false) String destinationAccountId,
            @RequestParam(required = false) String accountId,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "processed_at") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder) {

        if (limit > 100) limit = 100;
        if (page < 1) page = 1;

        PaginatedResponse<TransactionResponse> result = service.getTransactions(
                transactionId, sourceAccountId, destinationAccountId, accountId,
                currency, minAmount, maxAmount, fromDate, toDate,
                page, limit, sortBy, sortOrder);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/transactions/{id}")
    public ResponseEntity<?> getTransaction(@PathVariable String id) {
        TransactionResponse txn = service.getTransactionById(id);
        if (txn == null) {
            return ResponseEntity.status(404).body(new ErrorResponse("Transaction not found"));
        }
        return ResponseEntity.ok(java.util.Map.of("data", txn));
    }
}
