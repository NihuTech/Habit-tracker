package com.habittracker.exception;

public class AppException extends RuntimeException {
    private final int statusCode;
    private final boolean operational;

    public AppException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.operational = true;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public boolean isOperational() {
        return operational;
    }
}
