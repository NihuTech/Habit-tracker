package com.habittracker.util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Pure date utilities operating strictly on 'YYYY-MM-DD' strings in UTC.
 * Ensures zero timezone off-by-one errors and accurate calendar calculations.
 */
public final class DateUtils {

    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
    private static final DateTimeFormatter STRICT_FORMATTER = DateTimeFormatter.ofPattern("uuuu-MM-dd")
            .withResolverStyle(ResolverStyle.STRICT);

    private DateUtils() {
    }

    public static boolean isLeapYear(int year) {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    }

    public static int daysInMonth(int year, int month) {
        switch (month) {
            case 2:
                return isLeapYear(year) ? 29 : 28;
            case 4:
            case 6:
            case 9:
            case 11:
                return 30;
            default:
                return 31;
        }
    }

    public static boolean isValidDateString(Object dateStr) {
        if (!(dateStr instanceof String s)) {
            return false;
        }
        if (!DATE_PATTERN.matcher(s).matches()) {
            return false;
        }
        try {
            LocalDate.parse(s, STRICT_FORMATTER);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static LocalDate parseDateUTC(String dateStr) {
        return LocalDate.parse(dateStr, STRICT_FORMATTER);
    }

    public static String formatDateUTC(LocalDate date) {
        return date.format(STRICT_FORMATTER);
    }

    public static String addDays(String dateStr, int days) {
        LocalDate date = parseDateUTC(dateStr);
        return formatDateUTC(date.plusDays(days));
    }

    /**
     * Returns day of week in UTC: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
     */
    public static int getWeekday(String dateStr) {
        LocalDate date = parseDateUTC(dateStr);
        DayOfWeek dow = date.getDayOfWeek();
        return dow.getValue() % 7;
    }

    public static String getTodayUTC() {
        return formatDateUTC(LocalDate.now(ZoneOffset.UTC));
    }

    public static int compareDates(String a, String b) {
        int cmp = a.compareTo(b);
        if (cmp < 0) return -1;
        if (cmp > 0) return 1;
        return 0;
    }

    public static long daysBetween(String from, String to) {
        LocalDate d1 = parseDateUTC(from);
        LocalDate d2 = parseDateUTC(to);
        return java.time.temporal.ChronoUnit.DAYS.between(d1, d2);
    }

    public static List<String> dateRange(String from, String to) {
        if (compareDates(from, to) > 0) {
            return new ArrayList<>();
        }
        List<String> dates = new ArrayList<>();
        String current = from;
        while (compareDates(current, to) <= 0) {
            dates.add(current);
            current = addDays(current, 1);
        }
        return dates;
    }
}
