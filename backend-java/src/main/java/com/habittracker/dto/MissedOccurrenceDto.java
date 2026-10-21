package com.habittracker.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class MissedOccurrenceDto {

    private String habitId;
    private String habitTitle;
    private String date;
    private boolean hasRecovery;
    private RecoveryRecordDto recovery;

    public MissedOccurrenceDto() {
    }

    public MissedOccurrenceDto(String habitId, String habitTitle, String date,
                               boolean hasRecovery, RecoveryRecordDto recovery) {
        this.habitId = habitId;
        this.habitTitle = habitTitle;
        this.date = date;
        this.hasRecovery = hasRecovery;
        this.recovery = recovery;
    }

    public String getHabitId() {
        return habitId;
    }

    public void setHabitId(String habitId) {
        this.habitId = habitId;
    }

    public String getHabitTitle() {
        return habitTitle;
    }

    public void setHabitTitle(String habitTitle) {
        this.habitTitle = habitTitle;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public boolean isHasRecovery() {
        return hasRecovery;
    }

    public void setHasRecovery(boolean hasRecovery) {
        this.hasRecovery = hasRecovery;
    }

    public RecoveryRecordDto getRecovery() {
        return recovery;
    }

    public void setRecovery(RecoveryRecordDto recovery) {
        this.recovery = recovery;
    }
}
