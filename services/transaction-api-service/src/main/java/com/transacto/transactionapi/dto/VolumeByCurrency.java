package com.transacto.transactionapi.dto;

import java.math.BigDecimal;

public class VolumeByCurrency {

    private String currency;
    private long txCount;
    private BigDecimal totalVolume;

    public VolumeByCurrency(String currency, long txCount, BigDecimal totalVolume) {
        this.currency = currency;
        this.txCount = txCount;
        this.totalVolume = totalVolume;
    }

    public String getCurrency() { return currency; }
    public long getTxCount() { return txCount; }
    public BigDecimal getTotalVolume() { return totalVolume; }
}
