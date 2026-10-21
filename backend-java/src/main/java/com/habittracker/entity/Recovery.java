package com.habittracker.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "recoveries", uniqueConstraints = {
        @UniqueConstraint(name = "uk_recovery_habit_date", columnNames = {"habit_id", "date"})
})
public class Recovery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "habit_id", nullable = false)
    private Habit habit;

    @Column(nullable = false, length = 10)
    private String date;

    @Column(nullable = false)
    private boolean promptShown = true;

    @Column(nullable = false)
    private boolean handled = true;

    @Column(nullable = false, length = 64)
    private String reason;

    @Column(length = 1000)
    private String explanation;

    @Column(length = 1000)
    private String adjustment;

    @Column(length = 255)
    private String actionTaken;

    @Column(nullable = false)
    private String recordedAt;

    public Recovery() {
    }

    public Recovery(Habit habit, String date, boolean promptShown, boolean handled,
                    String reason, String explanation, String adjustment, String actionTaken, String recordedAt) {
        this.habit = habit;
        this.date = date;
        this.promptShown = promptShown;
        this.handled = handled;
        this.reason = reason;
        this.explanation = explanation;
        this.adjustment = adjustment;
        this.actionTaken = actionTaken;
        this.recordedAt = recordedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Habit getHabit() {
        return habit;
    }

    public void setHabit(Habit habit) {
        this.habit = habit;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
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
