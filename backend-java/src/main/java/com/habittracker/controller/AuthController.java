package com.habittracker.controller;

import com.habittracker.dto.ApiResponse;
import com.habittracker.dto.AuthResponse;
import com.habittracker.dto.LoginRequest;
import com.habittracker.dto.SignupRequest;
import com.habittracker.dto.UserResponseDto;
import com.habittracker.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<AuthResponse>> signup(@RequestBody(required = false) SignupRequest request) {
        AuthResponse response = authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody(required = false) LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponseDto>> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        UserResponseDto user = authService.getCurrentUser(authorizationHeader);
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        authService.logout(authorizationHeader);
        return ResponseEntity.ok(ApiResponse.messageOnly("Logged out successfully."));
    }
}
