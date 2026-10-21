package com.habittracker;

import com.habittracker.dto.CreateHabitDto;
import com.habittracker.entity.Habit;
import com.habittracker.exception.BadRequestException;
import com.habittracker.service.ScheduleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ScheduleServiceTest {

    private ScheduleService scheduleService;

    @BeforeEach
    void setUp() {
        scheduleService = new ScheduleService();
    }

    private Habit createBaseHabit() {
        Habit habit = new Habit();
        habit.setId("h-1");
        habit.setUserId("u-1");
        habit.setTitle("Test Habit");
        habit.setNotes("");
        habit.setDurationValue(10);
        habit.setDurationUnit("minutes");
        habit.setFrequency("daily");
        habit.setStartDate("2026-10-01");
        habit.setEndDate("2026-10-31");
        habit.setOneTimeDate(null);
        habit.setWeekdays(new ArrayList<>());
        habit.setExtraDates(new ArrayList<>());
        habit.setActive(true);
        habit.setCreatedAt("2026-10-01T00:00:00Z");
        habit.setUpdatedAt("2026-10-01T00:00:00Z");
        return habit;
    }

    @Test
    @DisplayName("handles daily frequency within range")
    void testDailyFrequency() {
        Habit habit = createBaseHabit();
        assertFalse(scheduleService.isScheduledOn(habit, "2026-09-30")); // Before start
        assertTrue(scheduleService.isScheduledOn(habit, "2026-10-01"));  // On start
        assertTrue(scheduleService.isScheduledOn(habit, "2026-10-15"));  // During
        assertTrue(scheduleService.isScheduledOn(habit, "2026-10-31"));  // On end
        assertFalse(scheduleService.isScheduledOn(habit, "2026-11-01")); // After end
    }

    @Test
    @DisplayName("handles weekly frequency respecting scheduled weekdays (Mon=1, Wed=3, Fri=5)")
    void testWeeklyFrequency() {
        Habit habit = createBaseHabit();
        habit.setFrequency("weekly");
        habit.setWeekdays(Arrays.asList(1, 3, 5));

        // 2026-10-12 is Monday (1)
        assertTrue(scheduleService.isScheduledOn(habit, "2026-10-12"));
        // 2026-10-13 is Tuesday (2, not scheduled)
        assertFalse(scheduleService.isScheduledOn(habit, "2026-10-13"));
        // 2026-10-14 is Wednesday (3)
        assertTrue(scheduleService.isScheduledOn(habit, "2026-10-14"));
        // 2026-10-18 is Sunday (0)
        assertFalse(scheduleService.isScheduledOn(habit, "2026-10-18"));
    }

    @Test
    @DisplayName("handles custom frequency with weekdays")
    void testCustomFrequency() {
        Habit habit = createBaseHabit();
        habit.setFrequency("custom");
        habit.setWeekdays(Arrays.asList(0, 6)); // Weekends: Sun(0), Sat(6)

        // 2026-10-17 is Saturday (6)
        assertTrue(scheduleService.isScheduledOn(habit, "2026-10-17"));
        // 2026-10-18 is Sunday (0)
        assertTrue(scheduleService.isScheduledOn(habit, "2026-10-18"));
        // 2026-10-19 is Monday (1)
        assertFalse(scheduleService.isScheduledOn(habit, "2026-10-19"));
    }

    @Test
    @DisplayName("handles one-time frequency only on designated date")
    void testOneTimeFrequency() {
        Habit habit = createBaseHabit();
        habit.setFrequency("one-time");
        habit.setOneTimeDate("2026-10-25");

        assertFalse(scheduleService.isScheduledOn(habit, "2026-10-24"));
        assertTrue(scheduleService.isScheduledOn(habit, "2026-10-25"));
        assertFalse(scheduleService.isScheduledOn(habit, "2026-10-26"));
    }

    @Test
    @DisplayName("allows extraDates to schedule occurrences outside regular rules")
    void testExtraDates() {
        Habit habit = createBaseHabit();
        habit.setFrequency("weekly");
        habit.setWeekdays(Collections.singletonList(1)); // Monday
        habit.setExtraDates(Collections.singletonList("2026-10-15")); // Thursday extra date

        // 2026-10-15 is Thursday, not in weekdays, but in extraDates
        assertTrue(scheduleService.isScheduledOn(habit, "2026-10-15"));
    }

    @Test
    @DisplayName("returns all scheduled dates in interval")
    void testGetScheduledDates() {
        Habit habit = createBaseHabit();
        habit.setFrequency("weekly");
        habit.setWeekdays(Arrays.asList(1, 5)); // Monday & Friday
        habit.setEndDate(null);

        // Range: 2026-10-12 (Mon) to 2026-10-19 (Mon)
        // Expected: 10-12 (Mon), 10-16 (Fri), 10-19 (Mon)
        List<String> dates = scheduleService.getScheduledDates(habit, "2026-10-12", "2026-10-19");
        assertEquals(Arrays.asList("2026-10-12", "2026-10-16", "2026-10-19"), dates);
    }

    @Test
    @DisplayName("validateSchedule rejects empty title")
    void testRejectEmptyTitle() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("   ");
        dto.setStartDate("2026-10-21");
        dto.setFrequency("daily");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> scheduleService.validateSchedule(dto));
        assertTrue(ex.getMessage().contains("Habit title is required"));
    }

    @Test
    @DisplayName("validateSchedule rejects invalid startDate")
    void testRejectInvalidStartDate() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Run");
        dto.setStartDate("not-a-date");
        dto.setFrequency("daily");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> scheduleService.validateSchedule(dto));
        assertTrue(ex.getMessage().contains("startDate must be a valid date"));
    }

    @Test
    @DisplayName("validateSchedule rejects endDate prior to startDate")
    void testRejectEndDateBeforeStartDate() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Run");
        dto.setStartDate("2026-10-20");
        dto.setEndDate("2026-10-10");
        dto.setFrequency("daily");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> scheduleService.validateSchedule(dto));
        assertTrue(ex.getMessage().contains("cannot be before startDate"));
    }

    @Test
    @DisplayName("validateSchedule rejects weekly habit with empty weekdays array")
    void testRejectWeeklyEmptyWeekdays() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Run");
        dto.setStartDate("2026-10-20");
        dto.setFrequency("weekly");
        dto.setWeekdays(new ArrayList<>());

        BadRequestException ex = assertThrows(BadRequestException.class, () -> scheduleService.validateSchedule(dto));
        assertTrue(ex.getMessage().contains("weekdays array with at least one day"));
    }

    @Test
    @DisplayName("validateSchedule accepts valid daily habit")
    void testAcceptValidDailyHabit() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Drink Water");
        dto.setStartDate("2026-10-20");
        dto.setFrequency("daily");

        assertDoesNotThrow(() -> scheduleService.validateSchedule(dto));
    }
}
