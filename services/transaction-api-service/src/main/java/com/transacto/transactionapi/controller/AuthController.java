package com.transacto.transactionapi.controller;

import com.transacto.transactionapi.dto.ErrorResponse;
import com.transacto.transactionapi.dto.LoginRequest;
import com.transacto.transactionapi.dto.LoginResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import java.util.Map;

@RestController
public class AuthController {

    private final RestClient restClient;
    private final String jwtServiceUrl;

    public AuthController(RestClient restClient,
                          @Value("${app.jwt-service.url}") String jwtServiceUrl) {
        this.restClient = restClient;
        this.jwtServiceUrl = jwtServiceUrl;
    }

    @PostMapping("/api/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            ResponseEntity<Map> response = restClient.post()
                    .uri(jwtServiceUrl + "/api/auth/login")
                    .body(Map.of("email", request.getEmail(), "password", request.getPassword()))
                    .retrieve()
                    .toEntity(Map.class);

            Map<String, Object> body = response.getBody();
            LoginResponse loginResponse = new LoginResponse();
            loginResponse.setAccessToken((String) body.get("accessToken"));
            loginResponse.setRefreshToken((String) body.get("refreshToken"));
            loginResponse.setUser((Map<String, Object>) body.get("user"));

            return ResponseEntity.ok(loginResponse);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(new ErrorResponse("Unable to reach auth service"));
        }
    }
}
