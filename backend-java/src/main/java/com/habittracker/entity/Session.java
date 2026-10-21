package com.habittracker.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "sessions")
public class Session {

    @Id
    @Column(nullable = false, length = 64)
    private String token;

    @Column(nullable = false, length = 64)
    private String userId;

    @Column(nullable = false)
    private Instant expiresAt;

    public Session() {
    }

    public Session(String token, String userId, Instant expiresAt) {
        this.token = token;
        this.userId = userId;
        this.expiresAt = expiresAt;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
