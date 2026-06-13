package com.transacto.transactionapi.security;

public class TransactoUserDetails {

    private final String id;
    private final String email;
    private final String role;

    public TransactoUserDetails(String id, String email, String role) {
        this.id = id;
        this.email = email;
        this.role = role;
    }

    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
}
