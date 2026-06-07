package com.transacto.transactionapi.dto;

import java.util.List;

public class StatsResponse {

    private long totalEvents;
    private long totalAccounts;
    private List<VolumeByCurrency> volumeByCurrency;

    public long getTotalEvents() { return totalEvents; }
    public void setTotalEvents(long totalEvents) { this.totalEvents = totalEvents; }
    public long getTotalAccounts() { return totalAccounts; }
    public void setTotalAccounts(long totalAccounts) { this.totalAccounts = totalAccounts; }
    public List<VolumeByCurrency> getVolumeByCurrency() { return volumeByCurrency; }
    public void setVolumeByCurrency(List<VolumeByCurrency> volumeByCurrency) { this.volumeByCurrency = volumeByCurrency; }
}
