package com.habittracker.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

public class HabitResponseDto {

    private String id;
    private String userId;
    private String title;
    private String notes;
    private int durationValue;
    private String durationUnit;
    private String frequency;
    private String startDate;
    private String endDate;
    private String oneTimeDate;
    private List<Integer> weekdays;
    private List<String> extraDates;
    private Map<String, Boolean> completions;
    private Map<String, RecoveryRecordDto> recoveries;

    @JsonProperty("isActive")
    private boolean isActive;

    private String createdAt;
    private String updatedAt;

    public HabitResponseDto() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public int getDurationValue() {
        return durationValue;
    }

    public void setDurationValue(int durationValue) {
        this.durationValue = durationValue;
    }

    public String getDurationUnit() {
        return durationUnit;
    }

    public void setDurationUnit(String durationUnit) {
        this.durationUnit = durationUnit;
    }

    public String getFrequency() {
        return frequency;
    }

    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public String getOneTimeDate() {
        return oneTimeDate;
    }

    public void setOneTimeDate(String oneTimeDate) {
        this.oneTimeDate = oneTimeDate;
    }

    public List<Integer> getWeekdays() {
        return weekdays;
    }

    public void setWeekdays(List<Integer> weekdays) {
        this.weekdays = weekdays;
    }

    public List<String> getExtraDates() {
        return extraDates;
    }

    public void setExtraDates(List<String> extraDates) {
        this.extraDates = extraDates;
    }

    public Map<String, Boolean> getCompletions() {
        return completions;
    }

    public void setCompletions(Map<String, Boolean> completions) {
        this.completions = completions;
    }

    public Map<String, RecoveryRecordDto> getRecoveries() {
        return recoveries;
    }

    public void setRecoveries(Map<String, RecoveryRecordDto> recoveries) {
        this.recoveries = recoveries;
    }

    @JsonProperty("isActive")
    public boolean isActive() {
        return isActive;
    }

    @JsonProperty("isActive")
    public void setActive(boolean active) {
        isActive = active;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
