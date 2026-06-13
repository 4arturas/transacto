package com.transacto.transactionapi.dto;

import java.util.List;

public class PaginatedResponse<T> {

    private List<T> data;
    private PaginationInfo pagination;

    public PaginatedResponse(List<T> data, int page, int limit, int total) {
        this.data = data;
        this.pagination = new PaginationInfo(page, limit, total);
    }

    public List<T> getData() { return data; }
    public PaginationInfo getPagination() { return pagination; }

    public static class PaginationInfo {
        private int page;
        private int limit;
        private int total;

        public PaginationInfo(int page, int limit, int total) {
            this.page = page;
            this.limit = limit;
            this.total = total;
        }

        public int getPage() { return page; }
        public int getLimit() { return limit; }
        public int getTotal() { return total; }
    }
}
