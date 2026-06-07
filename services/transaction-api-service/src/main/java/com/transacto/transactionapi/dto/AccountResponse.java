package com.transacto.transactionapi.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class AccountResponse {

    private String accountId;
    private BigDecimal balance;
    private String currency;
    private OffsetDateTime updatedAt;

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
