package com.habittracker.exception;

public class BadRequestException extends AppException {
    public BadRequestException(String message) {
        super(message != null ? message : "Bad request", 400);
    }
}
