package com.habittracker.exception;

public class ConflictException extends AppException {
    public ConflictException(String message) {
        super(message != null ? message : "Resource conflict", 409);
    }
}
