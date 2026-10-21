package com.habittracker.dto;

public class CompletionRequestDto {

    private String date;
    private String referenceDate;

    public CompletionRequestDto() {
    }

    public CompletionRequestDto(String date, String referenceDate) {
        this.date = date;
        this.referenceDate = referenceDate;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getReferenceDate() {
        return referenceDate;
    }

    public void setReferenceDate(String referenceDate) {
        this.referenceDate = referenceDate;
    }
}
