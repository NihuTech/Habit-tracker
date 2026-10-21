package com.habittracker.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class StreakResponseDto {

    private String habitId;
    private int currentStreak;
    private int longestStreak;
    private String lastCompletedDate;

    @JsonProperty("isCompletedToday")
    private boolean isCompletedToday;

    private boolean todayScheduled;

    public StreakResponseDto() {
    }

    public StreakResponseDto(String habitId, int currentStreak, int longestStreak,
                             String lastCompletedDate, boolean isCompletedToday, boolean todayScheduled) {
        this.habitId = habitId;
        this.currentStreak = currentStreak;
        this.longestStreak = longestStreak;
        this.lastCompletedDate = lastCompletedDate;
        this.isCompletedToday = isCompletedToday;
        this.todayScheduled = todayScheduled;
    }

    public String getHabitId() {
        return habitId;
    }

    public void setHabitId(String habitId) {
        this.habitId = habitId;
    }

    public int getCurrentStreak() {
        return currentStreak;
    }

    public void setCurrentStreak(int currentStreak) {
        this.currentStreak = currentStreak;
    }

    public int getLongestStreak() {
        return longestStreak;
    }

    public void setLongestStreak(int longestStreak) {
        this.longestStreak = longestStreak;
    }

    public String getLastCompletedDate() {
        return lastCompletedDate;
    }

    public void setLastCompletedDate(String lastCompletedDate) {
        this.lastCompletedDate = lastCompletedDate;
    }

    @JsonProperty("isCompletedToday")
    public boolean isCompletedToday() {
        return isCompletedToday;
    }

    @JsonProperty("isCompletedToday")
    public void setCompletedToday(boolean completedToday) {
        isCompletedToday = completedToday;
    }

    public boolean isTodayScheduled() {
        return todayScheduled;
    }

    public void setTodayScheduled(boolean todayScheduled) {
        this.todayScheduled = todayScheduled;
    }
}
