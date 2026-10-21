package com.habittracker.service;

import com.habittracker.dto.StreakResponseDto;
import com.habittracker.entity.Habit;
import com.habittracker.util.DateUtils;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class StreakService {

    private final ScheduleService scheduleService;

    public StreakService(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    /**
     * Calculates current and longest streak for a habit.
     *
     * Current Streak Behavior for Today:
     * - If today is a scheduled day and is completed: today counts (+1).
     * - If today is a scheduled day and has NOT yet been completed: today is still in progress,
     *   so the streak is NOT broken. The current streak reflects the continuous streak up to
     *   the previous scheduled occurrence. Once today is completed, it immediately increments.
     * - If today is NOT a scheduled day (e.g. rest day): unscheduled days do NOT break a streak.
     *   The streak reflects the continuous streak up to the most recent scheduled occurrence.
     * - If a previous scheduled occurrence was missed: current streak resets to 0.
     *
     * @param habit The habit entity containing schedule
     * @param completionDates Set of 'YYYY-MM-DD' dates completed
     * @param referenceDate Reference date string ('YYYY-MM-DD'). Defaults to today in UTC.
     */
    public StreakResponseDto calculateStreak(Habit habit, Set<String> completionDates, String referenceDate) {
        String today = referenceDate != null ? referenceDate : DateUtils.getTodayUTC();
        boolean isCompletedToday = completionDates.contains(today);
        boolean todayScheduled = scheduleService.isScheduledOn(habit, today);

        // 1. One-time habits have binary streak (1 if completed, 0 if not)
        if ("one-time".equals(habit.getFrequency())) {
            String targetDate = habit.getOneTimeDate() != null ? habit.getOneTimeDate() : habit.getStartDate();
            boolean completed = completionDates.contains(targetDate);
            return new StreakResponseDto(
                    habit.getId(),
                    completed ? 1 : 0,
                    completed ? 1 : 0,
                    completed ? targetDate : null,
                    isCompletedToday,
                    Objects.equals(targetDate, today)
            );
        }

        // 2. Determine effective date bounds for historical evaluation
        String effectiveEnd = (habit.getEndDate() != null && DateUtils.compareDates(habit.getEndDate(), today) < 0)
                ? habit.getEndDate()
                : today;

        if (DateUtils.compareDates(habit.getStartDate(), effectiveEnd) > 0) {
            return new StreakResponseDto(
                    habit.getId(),
                    0,
                    0,
                    null,
                    false,
                    false
            );
        }

        // All scheduled occurrences in chronological order from startDate up to effectiveEnd
        List<String> scheduledDates = scheduleService.getScheduledDates(habit, habit.getStartDate(), effectiveEnd);

        // Find all completed dates for calculating lastCompletedDate
        List<String> completedScheduledDates = scheduledDates.stream()
                .filter(completionDates::contains)
                .toList();
        String lastCompletedDate = completedScheduledDates.isEmpty()
                ? null
                : completedScheduledDates.get(completedScheduledDates.size() - 1);

        // 3. Calculate Longest Streak across all scheduled dates up to today
        int longestStreak = 0;
        int currentRunning = 0;

        for (String date : scheduledDates) {
            if (completionDates.contains(date)) {
                currentRunning++;
                if (currentRunning > longestStreak) {
                    longestStreak = currentRunning;
                }
            } else {
                currentRunning = 0;
            }
        }

        // 4. Calculate Current Streak
        // We work backwards from the most recent relevant scheduled date.
        int currentStreak = 0;

        if (!scheduledDates.isEmpty()) {
            int startIndex;
            String lastScheduled = scheduledDates.get(scheduledDates.size() - 1);

            if (lastScheduled.equals(today)) {
                if (isCompletedToday) {
                    // Today is completed, count backwards from today
                    startIndex = scheduledDates.size() - 1;
                } else {
                    // Today is scheduled but not completed yet:
                    // Do not break the streak. Count backwards starting from the previous scheduled day.
                    startIndex = scheduledDates.size() - 2;
                }
            } else {
                // Today is not scheduled (or habit ended in past):
                // Count backwards starting from the last scheduled day.
                startIndex = scheduledDates.size() - 1;
            }

            // Traverse backwards through scheduled occurrences
            for (int i = startIndex; i >= 0; i--) {
                String scheduledDate = scheduledDates.get(i);
                if (completionDates.contains(scheduledDate)) {
                    currentStreak++;
                } else {
                    // A scheduled day was not completed: streak is broken!
                    break;
                }
            }
        }

        return new StreakResponseDto(
                habit.getId(),
                currentStreak,
                longestStreak,
                lastCompletedDate,
                isCompletedToday,
                todayScheduled
        );
    }
}
