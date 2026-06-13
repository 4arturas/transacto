package com.transacto.transactionapi.controller;

import com.transacto.transactionapi.dto.StatsResponse;
import com.transacto.transactionapi.service.TransactionApiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class StatsController {

    private final TransactionApiService service;

    public StatsController(TransactionApiService service) {
        this.service = service;
    }

    @GetMapping("/stats")
    public ResponseEntity<StatsResponse> stats() {
        return ResponseEntity.ok(service.getStats());
    }
}
