package com.habittracker;

import com.habittracker.dto.StreakResponseDto;
import com.habittracker.entity.Habit;
import com.habittracker.service.ScheduleService;
import com.habittracker.service.StreakService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class StreakServiceTest {

    private ScheduleService scheduleService;
    private StreakService streakService;

    @BeforeEach
    void setUp() {
        scheduleService = new ScheduleService();
        streakService = new StreakService(scheduleService);
    }

    private Habit createDailyHabit(String startDate) {
        Habit habit = new Habit();
        habit.setId("habit-daily-1");
        habit.setUserId("user-001");
        habit.setTitle("Daily Meditation");
        habit.setNotes("");
        habit.setDurationValue(10);
        habit.setDurationUnit("minutes");
        habit.setFrequency("daily");
        habit.setStartDate(startDate);
        habit.setEndDate(null);
        habit.setOneTimeDate(null);
        habit.setWeekdays(new ArrayList<>());
        habit.setExtraDates(new ArrayList<>());
        habit.setActive(true);
        habit.setCreatedAt(startDate + "T08:00:00Z");
        habit.setUpdatedAt(startDate + "T08:00:00Z");
        return habit;
    }

    @Test
    @DisplayName("calculates 0 for habit with zero completions")
    void testZeroCompletions() {
        Habit habit = createDailyHabit("2026-10-01");
        StreakResponseDto streak = streakService.calculateStreak(habit, Collections.emptySet(), "2026-10-05");

        assertEquals(0, streak.getCurrentStreak());
        assertEquals(0, streak.getLongestStreak());
        assertNull(streak.getLastCompletedDate());
        assertFalse(streak.isCompletedToday());
    }

    @Test
    @DisplayName("calculates first completion properly (streak = 1)")
    void testFirstCompletion() {
        Habit habit = createDailyHabit("2026-10-01");
        StreakResponseDto streak = streakService.calculateStreak(habit, Collections.singleton("2026-10-05"), "2026-10-05");

        assertEquals(1, streak.getCurrentStreak());
        assertEquals(1, streak.getLongestStreak());
        assertEquals("2026-10-05", streak.getLastCompletedDate());
        assertTrue(streak.isCompletedToday());
    }

    @Test
    @DisplayName("increments streak for consecutive daily completions")
    void testConsecutiveDailyCompletions() {
        Habit habit = createDailyHabit("2026-10-01");
        Set<String> completions = new HashSet<>(Arrays.asList(
                "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"
        ));
        StreakResponseDto streak = streakService.calculateStreak(habit, completions, "2026-10-05");

        assertEquals(5, streak.getCurrentStreak());
        assertEquals(5, streak.getLongestStreak());
        assertEquals("2026-10-05", streak.getLastCompletedDate());
    }

    @Test
    @DisplayName("preserves current streak when today is scheduled but not completed yet")
    void testPreserveStreakWhenTodayInProgress() {
        // Reference date: 2026-10-05
        // Completed up to yesterday (2026-10-04), today (2026-10-05) is not completed yet
        Habit habit = createDailyHabit("2026-10-01");
        Set<String> completions = new HashSet<>(Arrays.asList(
                "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"
        ));
        StreakResponseDto streak = streakService.calculateStreak(habit, completions, "2026-10-05");

        assertEquals(4, streak.getCurrentStreak());
        assertEquals(4, streak.getLongestStreak());
        assertFalse(streak.isCompletedToday());
        assertTrue(streak.isTodayScheduled());
        assertEquals("2026-10-04", streak.getLastCompletedDate());
    }

    @Test
    @DisplayName("resets current streak to 0 if yesterday was scheduled and missed")
    void testResetStreakIfYesterdayMissed() {
        // Reference date: 2026-10-05
        // Completed 10-01, 10-02, 10-03. Missed 10-04. Not completed today 10-05.
        Habit habit = createDailyHabit("2026-10-01");
        Set<String> completions = new HashSet<>(Arrays.asList(
                "2026-10-01", "2026-10-02", "2026-10-03"
        ));
        StreakResponseDto streak = streakService.calculateStreak(habit, completions, "2026-10-05");

        assertEquals(0, streak.getCurrentStreak());
        assertEquals(3, streak.getLongestStreak()); // Historical record preserved
        assertEquals("2026-10-03", streak.getLastCompletedDate());
    }

    @Test
    @DisplayName("preserves longest streak after broken streak and restarts new current streak")
    void testPreserveLongestStreak() {
        // Historical run of 5 days, break on 10-06, then new run of 2 days (10-07, 10-08)
        Habit habit = createDailyHabit("2026-10-01");
        Set<String> completions = new HashSet<>(Arrays.asList(
                "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05",
                "2026-10-07", "2026-10-08"
        ));
        StreakResponseDto streak = streakService.calculateStreak(habit, completions, "2026-10-08");

        assertEquals(2, streak.getCurrentStreak());
        assertEquals(5, streak.getLongestStreak());
        assertEquals("2026-10-08", streak.getLastCompletedDate());
    }

    @Test
    @DisplayName("handles weekly and custom habits without breaking on unscheduled days")
    void testWeeklyHabitOnUnscheduledDays() {
        // Scheduled Mon (1) and Wed (3)
        // 2026-10-12: Mon (completed)
        // 2026-10-13: Tue (unscheduled)
        // 2026-10-14: Wed (completed)
        // 2026-10-15: Thu (unscheduled)
        Habit habit = new Habit();
        habit.setId("habit-weekly-1");
        habit.setUserId("user-001");
        habit.setTitle("Strength Training");
        habit.setNotes("");
        habit.setDurationValue(45);
        habit.setDurationUnit("minutes");
        habit.setFrequency("weekly");
        habit.setStartDate("2026-10-01");
        habit.setEndDate(null);
        habit.setOneTimeDate(null);
        habit.setWeekdays(Arrays.asList(1, 3));
        habit.setExtraDates(new ArrayList<>());
        habit.setActive(true);
        habit.setCreatedAt("2026-10-01T00:00:00Z");
        habit.setUpdatedAt("2026-10-14T00:00:00Z");

        Set<String> completions = new HashSet<>(Arrays.asList("2026-10-12", "2026-10-14"));

        // On Tuesday 10-13 (unscheduled day), streak must NOT break:
        StreakResponseDto tuesdayStreak = streakService.calculateStreak(habit, Collections.singleton("2026-10-12"), "2026-10-13");
        assertEquals(1, tuesdayStreak.getCurrentStreak());
        assertFalse(tuesdayStreak.isTodayScheduled());

        // On Wednesday 10-14 (completed scheduled day):
        StreakResponseDto wednesdayStreak = streakService.calculateStreak(habit, completions, "2026-10-14");
        assertEquals(2, wednesdayStreak.getCurrentStreak());
        assertEquals(2, wednesdayStreak.getLongestStreak());

        // On Thursday 10-15 (unscheduled day):
        StreakResponseDto thursdayStreak = streakService.calculateStreak(habit, completions, "2026-10-15");
        assertEquals(2, thursdayStreak.getCurrentStreak());
        assertFalse(thursdayStreak.isTodayScheduled());
    }

    @Test
    @DisplayName("breaks weekly habit streak only when a scheduled day was missed")
    void testBreakWeeklyWhenScheduledDayMissed() {
        // Scheduled Mon (1) and Wed (3)
        // Mon 10-12 completed, Wed 10-14 MISSED
        Habit habit = new Habit();
        habit.setId("habit-weekly-2");
        habit.setUserId("user-001");
        habit.setTitle("Weekly Task");
        habit.setNotes("");
        habit.setDurationValue(30);
        habit.setDurationUnit("minutes");
        habit.setFrequency("weekly");
        habit.setStartDate("2026-10-01");
        habit.setEndDate(null);
        habit.setOneTimeDate(null);
        habit.setWeekdays(Arrays.asList(1, 3));
        habit.setExtraDates(new ArrayList<>());
        habit.setActive(true);
        habit.setCreatedAt("2026-10-01T00:00:00Z");
        habit.setUpdatedAt("2026-10-12T00:00:00Z");

        Set<String> completions = Collections.singleton("2026-10-12");

        StreakResponseDto streak = streakService.calculateStreak(habit, completions, "2026-10-16"); // Friday
        assertEquals(0, streak.getCurrentStreak());
        assertEquals(1, streak.getLongestStreak());
    }

    @Test
    @DisplayName("correctly handles one-time habits (binary streak, non-repeating)")
    void testOneTimeHabit() {
        Habit uncompleted = new Habit();
        uncompleted.setId("one-time-1");
        uncompleted.setUserId("user-001");
        uncompleted.setTitle("File Tax Return");
        uncompleted.setNotes("");
        uncompleted.setDurationValue(60);
        uncompleted.setDurationUnit("minutes");
        uncompleted.setFrequency("one-time");
        uncompleted.setStartDate("2026-10-25");
        uncompleted.setEndDate(null);
        uncompleted.setOneTimeDate("2026-10-25");
        uncompleted.setWeekdays(new ArrayList<>());
        uncompleted.setExtraDates(new ArrayList<>());
        uncompleted.setActive(true);
        uncompleted.setCreatedAt("2026-10-01T00:00:00Z");
        uncompleted.setUpdatedAt("2026-10-01T00:00:00Z");

        StreakResponseDto streakUncompleted = streakService.calculateStreak(uncompleted, Collections.emptySet(), "2026-10-25");
        assertEquals(0, streakUncompleted.getCurrentStreak());
        assertEquals(0, streakUncompleted.getLongestStreak());

        StreakResponseDto streakCompleted = streakService.calculateStreak(uncompleted, Collections.singleton("2026-10-25"), "2026-10-25");
        assertEquals(1, streakCompleted.getCurrentStreak());
        assertEquals(1, streakCompleted.getLongestStreak());
    }

    @Test
    @DisplayName("handles leap day across calendar boundaries accurately")
    void testLeapYearStreak() {
        Habit habit = createDailyHabit("2024-02-01");
        Set<String> completions = new HashSet<>(Arrays.asList("2024-02-28", "2024-02-29", "2024-03-01"));

        StreakResponseDto streak = streakService.calculateStreak(habit, completions, "2024-03-01");
        assertEquals(3, streak.getCurrentStreak());
        assertEquals(3, streak.getLongestStreak());
    }

    @Test
    @DisplayName("handles year boundary seamlessly")
    void testYearBoundaryStreak() {
        Habit habit = createDailyHabit("2026-12-01");
        Set<String> completions = new HashSet<>(Arrays.asList("2026-12-31", "2027-01-01"));

        StreakResponseDto streak = streakService.calculateStreak(habit, completions, "2027-01-01");
        assertEquals(2, streak.getCurrentStreak());
    }
}
