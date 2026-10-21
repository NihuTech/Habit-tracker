package com.habittracker.dto;

public class RecoveryRequestDto {

    private String date;
    private String reason;
    private String explanation;
    private String adjustment;
    private String actionTaken;
    private Boolean promptShown;
    private Boolean handled;
    private String referenceDate;

    public RecoveryRequestDto() {
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
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

    public Boolean getPromptShown() {
        return promptShown;
    }

    public void setPromptShown(Boolean promptShown) {
        this.promptShown = promptShown;
    }

    public Boolean getHandled() {
        return handled;
    }

    public void setHandled(Boolean handled) {
        this.handled = handled;
    }

    public String getReferenceDate() {
        return referenceDate;
    }

    public void setReferenceDate(String referenceDate) {
        this.referenceDate = referenceDate;
    }
}
