package com.habittracker.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "habits")
public class Habit {

    @Id
    @Column(nullable = false, length = 64)
    private String id;

    @Column(nullable = false, length = 64)
    private String userId;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String notes;

    @Column(nullable = false)
    private int durationValue = 15;

    @Column(nullable = false, length = 32)
    private String durationUnit = "minutes";

    @Column(nullable = false, length = 32)
    private String frequency;

    @Column(nullable = false, length = 10)
    private String startDate;

    @Column(length = 10)
    private String endDate;

    @Column(length = 10)
    private String oneTimeDate;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "habit_weekdays", joinColumns = @JoinColumn(name = "habit_id"))
    @Column(name = "weekday")
    @OrderColumn(name = "day_order")
    private List<Integer> weekdays = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "habit_extra_dates", joinColumns = @JoinColumn(name = "habit_id"))
    @Column(name = "extra_date")
    @OrderColumn(name = "date_order")
    private List<String> extraDates = new ArrayList<>();

    @Column(nullable = false)
    private boolean isActive = true;

    @Column(nullable = false)
    private String createdAt;

    @Column(nullable = false)
    private String updatedAt;

    @OneToMany(mappedBy = "habit", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Completion> completions = new ArrayList<>();

    @OneToMany(mappedBy = "habit", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Recovery> recoveries = new ArrayList<>();

    public Habit() {
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
        this.weekdays = weekdays != null ? weekdays : new ArrayList<>();
    }

    public List<String> getExtraDates() {
        return extraDates;
    }

    public void setExtraDates(List<String> extraDates) {
        this.extraDates = extraDates != null ? extraDates : new ArrayList<>();
    }

    public boolean isActive() {
        return isActive;
    }

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

    public List<Completion> getCompletions() {
        return completions;
    }

    public void setCompletions(List<Completion> completions) {
        this.completions = completions != null ? completions : new ArrayList<>();
    }

    public List<Recovery> getRecoveries() {
        return recoveries;
    }

    public void setRecoveries(List<Recovery> recoveries) {
        this.recoveries = recoveries != null ? recoveries : new ArrayList<>();
    }
}
