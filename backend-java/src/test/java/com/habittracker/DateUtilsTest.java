package com.habittracker;

import com.habittracker.util.DateUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class DateUtilsTest {

    @Test
    @DisplayName("correctly identifies leap years")
    void testLeapYears() {
        assertTrue(DateUtils.isLeapYear(2024));
        assertTrue(DateUtils.isLeapYear(2020));
        assertTrue(DateUtils.isLeapYear(2000));
        assertFalse(DateUtils.isLeapYear(1900)); // Century non-leap
        assertFalse(DateUtils.isLeapYear(2025));
        assertFalse(DateUtils.isLeapYear(2026));
    }

    @Test
    @DisplayName("returns correct days in month including February leap day")
    void testDaysInMonth() {
        assertEquals(29, DateUtils.daysInMonth(2024, 2)); // Leap year
        assertEquals(28, DateUtils.daysInMonth(2025, 2)); // Non-leap year
        assertEquals(30, DateUtils.daysInMonth(2026, 4));
        assertEquals(31, DateUtils.daysInMonth(2026, 12));
    }

    @Test
    @DisplayName("validates YYYY-MM-DD date strings strictly")
    void testValidDateString() {
        assertTrue(DateUtils.isValidDateString("2026-10-21"));
        assertTrue(DateUtils.isValidDateString("2024-02-29")); // Valid leap day
        assertFalse(DateUtils.isValidDateString("2025-02-29")); // Invalid non-leap
        assertFalse(DateUtils.isValidDateString("2026-13-01")); // Month 13
        assertFalse(DateUtils.isValidDateString("2026-04-31")); // April has 30 days
        assertFalse(DateUtils.isValidDateString("invalid-date"));
        assertFalse(DateUtils.isValidDateString(null));
        assertFalse(DateUtils.isValidDateString(12345));
    }

    @Test
    @DisplayName("correctly advances across month and year boundaries without timezone drift")
    void testAddDays() {
        assertEquals("2026-03-01", DateUtils.addDays("2026-02-28", 1));
        assertEquals("2024-02-29", DateUtils.addDays("2024-02-28", 1)); // Leap day
        assertEquals("2024-03-01", DateUtils.addDays("2024-02-29", 1));
        assertEquals("2027-01-01", DateUtils.addDays("2026-12-31", 1)); // Year boundary
        assertEquals("2025-12-31", DateUtils.addDays("2026-01-01", -1));
    }

    @Test
    @DisplayName("compares dates accurately")
    void testCompareDates() {
        assertEquals(-1, DateUtils.compareDates("2026-01-01", "2026-01-02"));
        assertEquals(0, DateUtils.compareDates("2026-05-10", "2026-05-10"));
        assertEquals(1, DateUtils.compareDates("2027-01-01", "2026-12-31"));
    }

    @Test
    @DisplayName("generates date range correctly")
    void testDateRange() {
        List<String> range = DateUtils.dateRange("2026-10-01", "2026-10-03");
        assertEquals(List.of("2026-10-01", "2026-10-02", "2026-10-03"), range);

        List<String> empty = DateUtils.dateRange("2026-10-05", "2026-10-01");
        assertTrue(empty.isEmpty());
    }
}
