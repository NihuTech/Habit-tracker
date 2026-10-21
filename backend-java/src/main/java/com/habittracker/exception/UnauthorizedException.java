package com.habittracker.exception;

public class UnauthorizedException extends AppException {
    public UnauthorizedException(String message) {
        super(message != null ? message : "Unauthorized", 401);
    }
}
