package com.habittracker.dto;

public class CompletionResponseDto {

    private HabitResponseDto habit;
    private StreakResponseDto streak;

    public CompletionResponseDto() {
    }

    public CompletionResponseDto(HabitResponseDto habit, StreakResponseDto streak) {
        this.habit = habit;
        this.streak = streak;
    }

    public HabitResponseDto getHabit() {
        return habit;
    }

    public void setHabit(HabitResponseDto habit) {
        this.habit = habit;
    }

    public StreakResponseDto getStreak() {
        return streak;
    }

    public void setStreak(StreakResponseDto streak) {
        this.streak = streak;
    }
}
