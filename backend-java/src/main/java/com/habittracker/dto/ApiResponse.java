package com.habittracker.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private String error;
    private Integer count;
    private T data;

    public ApiResponse() {
    }

    public static <T> ApiResponse<T> ok(T data) {
        ApiResponse<T> resp = new ApiResponse<>();
        resp.setSuccess(true);
        resp.setData(data);
        return resp;
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        ApiResponse<T> resp = new ApiResponse<>();
        resp.setSuccess(true);
        resp.setMessage(message);
        resp.setData(data);
        return resp;
    }

    public static <T> ApiResponse<T> okWithCount(Integer count, T data) {
        ApiResponse<T> resp = new ApiResponse<>();
        resp.setSuccess(true);
        resp.setCount(count);
        resp.setData(data);
        return resp;
    }

    public static <T> ApiResponse<T> messageOnly(String message) {
        ApiResponse<T> resp = new ApiResponse<>();
        resp.setSuccess(true);
        resp.setMessage(message);
        return resp;
    }

    public static <T> ApiResponse<T> error(String errorMessage) {
        ApiResponse<T> resp = new ApiResponse<>();
        resp.setSuccess(false);
        resp.setError(errorMessage);
        return resp;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public Integer getCount() {
        return count;
    }

    public void setCount(Integer count) {
        this.count = count;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }
}
