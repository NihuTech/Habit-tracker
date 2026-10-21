package com.habittracker.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecoveryRecordDto {

    private boolean promptShown;
    private boolean handled;
    private String reason;
    private String explanation;
    private String adjustment;
    private String actionTaken;
    private String recordedAt;

    public RecoveryRecordDto() {
    }

    public RecoveryRecordDto(boolean promptShown, boolean handled, String reason, String explanation,
                             String adjustment, String actionTaken, String recordedAt) {
        this.promptShown = promptShown;
        this.handled = handled;
        this.reason = reason;
        this.explanation = explanation;
        this.adjustment = adjustment;
        this.actionTaken = actionTaken;
        this.recordedAt = recordedAt;
    }

    public boolean isPromptShown() {
        return promptShown;
    }

    public void setPromptShown(boolean promptShown) {
        this.promptShown = promptShown;
    }

    public boolean isHandled() {
        return handled;
    }

    public void setHandled(boolean handled) {
        this.handled = handled;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getAdjustment() {
        return adjustment;
    }

    public void setAdjustment(String adjustment) {
        this.adjustment = adjustment;
    }

    public String getActionTaken() {
        return actionTaken;
    }

    public void setActionTaken(String actionTaken) {
        this.actionTaken = actionTaken;
    }

    public String getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(String recordedAt) {
        this.recordedAt = recordedAt;
    }
}
