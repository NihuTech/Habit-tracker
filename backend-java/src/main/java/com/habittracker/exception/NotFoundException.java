package com.habittracker.exception;

public class NotFoundException extends AppException {
    public NotFoundException(String message) {
        super(message != null ? message : "Resource not found", 404);
    }
}
