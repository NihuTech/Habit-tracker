package com.habittracker.dto;

public class AuthResponse {

    private String token;
    private UserResponseDto user;

    public AuthResponse() {
    }

    public AuthResponse(String token, UserResponseDto user) {
        this.token = token;
        this.user = user;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UserResponseDto getUser() {
        return user;
    }

    public void setUser(UserResponseDto user) {
        this.user = user;
    }
}
