package com.transacto.transactionapi.controller;

import com.transacto.transactionapi.dto.AccountResponse;
import com.transacto.transactionapi.dto.ErrorResponse;
import com.transacto.transactionapi.dto.PaginatedResponse;
import com.transacto.transactionapi.service.TransactionApiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AccountController {

    private final TransactionApiService service;

    public AccountController(TransactionApiService service) {
        this.service = service;
    }

    @GetMapping("/accounts")
    public ResponseEntity<PaginatedResponse<AccountResponse>> listAccounts(
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) String accountIdSearch,
            @RequestParam(required = false) BigDecimal minBalance,
            @RequestParam(required = false) BigDecimal maxBalance,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "updated_at") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder) {

        if (limit > 100) limit = 100;
        if (page < 1) page = 1;

        PaginatedResponse<AccountResponse> result = service.getAccounts(
                currency, accountIdSearch, minBalance, maxBalance,
                page, limit, sortBy, sortOrder);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<?> getAccount(@PathVariable String accountId) {
        AccountResponse account = service.getAccountById(accountId);
        if (account == null) {
            return ResponseEntity.status(404).body(new ErrorResponse("Account not found"));
        }
        return ResponseEntity.ok(Map.of("data", account));
    }
}
