package com.habittracker.service;

import com.habittracker.dto.CreateHabitDto;
import com.habittracker.dto.UpdateHabitDto;
import com.habittracker.entity.Habit;
import com.habittracker.exception.BadRequestException;
import com.habittracker.util.DateUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Service
public class ScheduleService {

    private static final List<String> VALID_FREQUENCIES = Arrays.asList("one-time", "daily", "weekly", "custom");

    public boolean isScheduledOn(Habit habit, String date) {
        // Extra dates explicitly added override regular schedules
        if (habit.getExtraDates() != null && habit.getExtraDates().contains(date)) {
            return true;
        }

        // One-time habits occur only on their specific designated date
        if ("one-time".equals(habit.getFrequency())) {
            String targetDate = habit.getOneTimeDate() != null ? habit.getOneTimeDate() : habit.getStartDate();
            return Objects.equals(targetDate, date);
        }

        // Habits do not occur before their start date
        if (DateUtils.compareDates(date, habit.getStartDate()) < 0) {
            return false;
        }

        // Habits do not occur after their end date (if defined)
        if (habit.getEndDate() != null && DateUtils.compareDates(date, habit.getEndDate()) > 0) {
            return false;
        }

        // Daily habits occur every single day in the interval
        if ("daily".equals(habit.getFrequency())) {
            return true;
        }

        // Weekly and Custom habits occur on the configured weekdays
        if ("weekly".equals(habit.getFrequency()) || "custom".equals(habit.getFrequency())) {
            int weekday = DateUtils.getWeekday(date);
            return habit.getWeekdays() != null && habit.getWeekdays().contains(weekday);
        }

        return false;
    }

    public List<String> getScheduledDates(Habit habit, String fromDate, String toDate) {
        if (DateUtils.compareDates(fromDate, toDate) > 0) {
            return new ArrayList<>();
        }
        return DateUtils.dateRange(fromDate, toDate).stream()
                .filter(date -> isScheduledOn(habit, date))
                .toList();
    }

    public void validateSchedule(CreateHabitDto dto) {
        if (dto.getTitle() == null || dto.getTitle().trim().isEmpty()) {
            throw new BadRequestException("Habit title is required and cannot be empty.");
        }

        if (dto.getStartDate() == null || !DateUtils.isValidDateString(dto.getStartDate())) {
            throw new BadRequestException("startDate must be a valid date in YYYY-MM-DD format (received: " + dto.getStartDate() + ").");
        }

        if (dto.getEndDate() != null) {
            if (!DateUtils.isValidDateString(dto.getEndDate())) {
                throw new BadRequestException("endDate must be a valid date in YYYY-MM-DD format (received: " + dto.getEndDate() + ").");
            }
            String start = dto.getStartDate() != null ? dto.getStartDate() : "1970-01-01";
            if (DateUtils.compareDates(dto.getEndDate(), start) < 0) {
                throw new BadRequestException("endDate (" + dto.getEndDate() + ") cannot be before startDate (" + start + ").");
            }
        }

        if (dto.getFrequency() == null || !VALID_FREQUENCIES.contains(dto.getFrequency())) {
            throw new BadRequestException("frequency must be one of: " + String.join(", ", VALID_FREQUENCIES) + ".");
        }

        if ("one-time".equals(dto.getFrequency())) {
            String oneTimeDate = dto.getOneTimeDate() != null ? dto.getOneTimeDate() : dto.getStartDate();
            if (oneTimeDate == null || !DateUtils.isValidDateString(oneTimeDate)) {
                throw new BadRequestException("one-time habits require a valid oneTimeDate or startDate in YYYY-MM-DD format.");
            }
        }

        if ("weekly".equals(dto.getFrequency())) {
            if (dto.getWeekdays() == null || dto.getWeekdays().isEmpty() ||
                    !dto.getWeekdays().stream().allMatch(d -> d != null && d >= 0 && d <= 6)) {
                throw new BadRequestException("weekly habits require weekdays array with at least one day (0=Sun, ..., 6=Sat).");
            }
        }

        if ("custom".equals(dto.getFrequency())) {
            boolean hasWeekdays = dto.getWeekdays() != null && !dto.getWeekdays().isEmpty() &&
                    dto.getWeekdays().stream().allMatch(d -> d != null && d >= 0 && d <= 6);
            boolean hasExtra = dto.getExtraDates() != null && !dto.getExtraDates().isEmpty() &&
                    dto.getExtraDates().stream().allMatch(DateUtils::isValidDateString);

            if (!hasWeekdays && !hasExtra) {
                throw new BadRequestException("custom habits require valid weekdays or extraDates.");
            }
        }

        if (dto.getDurationValue() != null && dto.getDurationValue() <= 0) {
            throw new BadRequestException("durationValue must be a positive number greater than 0.");
        }

        if (dto.getDurationUnit() != null && !dto.getDurationUnit().equals("minutes") && !dto.getDurationUnit().equals("hours")) {
            throw new BadRequestException("durationUnit must be either 'minutes' or 'hours'.");
        }

        if (dto.getExtraDates() != null && !dto.getExtraDates().stream().allMatch(DateUtils::isValidDateString)) {
            throw new BadRequestException("extraDates must be an array of valid YYYY-MM-DD date strings.");
        }
    }

    public void validateSchedule(Habit existing, UpdateHabitDto dto) {
        String title = dto.getTitle() != null ? dto.getTitle() : existing.getTitle();
        if (dto.getTitle() != null && dto.getTitle().trim().isEmpty()) {
            throw new BadRequestException("Habit title is required and cannot be empty.");
        }

        String startDate = dto.getStartDate() != null ? dto.getStartDate() : existing.getStartDate();
        if (dto.getStartDate() != null && !DateUtils.isValidDateString(dto.getStartDate())) {
            throw new BadRequestException("startDate must be a valid date in YYYY-MM-DD format (received: " + dto.getStartDate() + ").");
        }

        String endDate = dto.getEndDate() != null ? dto.getEndDate() : existing.getEndDate();
        if (dto.getEndDate() != null) {
            if (!DateUtils.isValidDateString(dto.getEndDate())) {
                throw new BadRequestException("endDate must be a valid date in YYYY-MM-DD format (received: " + dto.getEndDate() + ").");
            }
            if (DateUtils.compareDates(dto.getEndDate(), startDate) < 0) {
                throw new BadRequestException("endDate (" + dto.getEndDate() + ") cannot be before startDate (" + startDate + ").");
            }
        }

        String frequency = dto.getFrequency() != null ? dto.getFrequency() : existing.getFrequency();
        if (dto.getFrequency() != null && !VALID_FREQUENCIES.contains(dto.getFrequency())) {
            throw new BadRequestException("frequency must be one of: " + String.join(", ", VALID_FREQUENCIES) + ".");
        }

        if ("one-time".equals(frequency)) {
            String oneTimeDate = dto.getOneTimeDate() != null ? dto.getOneTimeDate()
                    : (existing.getOneTimeDate() != null ? existing.getOneTimeDate() : startDate);
            if (oneTimeDate == null || !DateUtils.isValidDateString(oneTimeDate)) {
                throw new BadRequestException("one-time habits require a valid oneTimeDate or startDate in YYYY-MM-DD format.");
            }
        }

        List<Integer> weekdays = dto.getWeekdays() != null ? dto.getWeekdays() : existing.getWeekdays();
        if ("weekly".equals(frequency)) {
            if (weekdays == null || weekdays.isEmpty() ||
                    !weekdays.stream().allMatch(d -> d != null && d >= 0 && d <= 6)) {
                throw new BadRequestException("weekly habits require weekdays array with at least one day (0=Sun, ..., 6=Sat).");
            }
        }

        List<String> extraDates = dto.getExtraDates() != null ? dto.getExtraDates() : existing.getExtraDates();
        if ("custom".equals(frequency)) {
            boolean hasWeekdays = weekdays != null && !weekdays.isEmpty() &&
                    weekdays.stream().allMatch(d -> d != null && d >= 0 && d <= 6);
            boolean hasExtra = extraDates != null && !extraDates.isEmpty() &&
                    extraDates.stream().allMatch(DateUtils::isValidDateString);

            if (!hasWeekdays && !hasExtra) {
                throw new BadRequestException("custom habits require valid weekdays or extraDates.");
            }
        }

        if (dto.getDurationValue() != null && dto.getDurationValue() <= 0) {
            throw new BadRequestException("durationValue must be a positive number greater than 0.");
        }

        if (dto.getDurationUnit() != null && !dto.getDurationUnit().equals("minutes") && !dto.getDurationUnit().equals("hours")) {
            throw new BadRequestException("durationUnit must be either 'minutes' or 'hours'.");
        }

        if (dto.getExtraDates() != null && !dto.getExtraDates().stream().allMatch(DateUtils::isValidDateString)) {
            throw new BadRequestException("extraDates must be an array of valid YYYY-MM-DD date strings.");
        }
    }
}
