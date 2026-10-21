package com.habittracker.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecoverySuggestionDto {

    private String reason;
    private String label;
    private String suggestion;
    private List<String> recommendedActions;
    private Integer shorterMinutes;

    public RecoverySuggestionDto() {
    }

    public RecoverySuggestionDto(String reason, String label, String suggestion,
                                 List<String> recommendedActions, Integer shorterMinutes) {
        this.reason = reason;
        this.label = label;
        this.suggestion = suggestion;
        this.recommendedActions = recommendedActions;
        this.shorterMinutes = shorterMinutes;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getSuggestion() {
        return suggestion;
    }

    public void setSuggestion(String suggestion) {
        this.suggestion = suggestion;
    }

    public List<String> getRecommendedActions() {
        return recommendedActions;
    }

    public void setRecommendedActions(List<String> recommendedActions) {
        this.recommendedActions = recommendedActions;
    }

    public Integer getShorterMinutes() {
        return shorterMinutes;
    }

    public void setShorterMinutes(Integer shorterMinutes) {
        this.shorterMinutes = shorterMinutes;
    }
}
