package com.habittracker.dto;

import java.util.List;

public class CreateHabitDto {

    private String title;
    private String notes;
    private Integer durationValue;
    private String durationUnit;
    private String frequency;
    private String startDate;
    private String endDate;
    private String oneTimeDate;
    private List<Integer> weekdays;
    private List<String> extraDates;

    public CreateHabitDto() {
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

    public Integer getDurationValue() {
        return durationValue;
    }

    public void setDurationValue(Integer durationValue) {
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
}
