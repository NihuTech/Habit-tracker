package com.habittracker.dto;

public class RecordRecoveryResponseDto {

    private HabitResponseDto habit;
    private RecoveryRecordDto recovery;
    private RecoverySuggestionDto suggestion;

    public RecordRecoveryResponseDto() {
    }

    public RecordRecoveryResponseDto(HabitResponseDto habit, RecoveryRecordDto recovery, RecoverySuggestionDto suggestion) {
        this.habit = habit;
        this.recovery = recovery;
        this.suggestion = suggestion;
    }

    public HabitResponseDto getHabit() {
        return habit;
    }

    public void setHabit(HabitResponseDto habit) {
        this.habit = habit;
    }

    public RecoveryRecordDto getRecovery() {
        return recovery;
    }

    public void setRecovery(RecoveryRecordDto recovery) {
        this.recovery = recovery;
    }

    public RecoverySuggestionDto getSuggestion() {
        return suggestion;
    }

    public void setSuggestion(RecoverySuggestionDto suggestion) {
        this.suggestion = suggestion;
    }
}
