package com.habittracker.service;

import com.habittracker.dto.CompletionResponseDto;
import com.habittracker.dto.CreateHabitDto;
import com.habittracker.dto.HabitResponseDto;
import com.habittracker.dto.MissedOccurrenceDto;
import com.habittracker.dto.RecordRecoveryResponseDto;
import com.habittracker.dto.RecoveryRecordDto;
import com.habittracker.dto.RecoveryRequestDto;
import com.habittracker.dto.RecoverySuggestionDto;
import com.habittracker.dto.StreakResponseDto;
import com.habittracker.dto.UpdateHabitDto;
import com.habittracker.entity.Completion;
import com.habittracker.entity.Habit;
import com.habittracker.entity.Recovery;
import com.habittracker.exception.BadRequestException;
import com.habittracker.exception.ConflictException;
import com.habittracker.exception.NotFoundException;
import com.habittracker.repository.CompletionRepository;
import com.habittracker.repository.HabitRepository;
import com.habittracker.repository.RecoveryRepository;
import com.habittracker.util.DateUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class HabitService {

    private final HabitRepository habitRepository;
    private final CompletionRepository completionRepository;
    private final RecoveryRepository recoveryRepository;
    private final ScheduleService scheduleService;
    private final StreakService streakService;
    private final RecoveryService recoveryService;

    public HabitService(HabitRepository habitRepository,
                        CompletionRepository completionRepository,
                        RecoveryRepository recoveryRepository,
                        ScheduleService scheduleService,
                        StreakService streakService,
                        RecoveryService recoveryService) {
        this.habitRepository = habitRepository;
        this.completionRepository = completionRepository;
        this.recoveryRepository = recoveryRepository;
        this.scheduleService = scheduleService;
        this.streakService = streakService;
        this.recoveryService = recoveryService;
    }

    @Transactional(readOnly = true)
    public List<HabitResponseDto> listHabits(String userId, Boolean isActive) {
        List<Habit> habits;
        if (isActive != null) {
            habits = habitRepository.findByUserIdAndIsActive(userId, isActive);
        } else {
            habits = habitRepository.findByUserId(userId);
        }
        return habits.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Habit getHabitEntity(String userId, String habitId) {
        return habitRepository.findByIdAndUserId(habitId, userId)
                .orElseThrow(() -> new NotFoundException("Habit with ID '" + habitId + "' not found for this user."));
    }

    @Transactional(readOnly = true)
    public HabitResponseDto getHabit(String userId, String habitId) {
        Habit habit = getHabitEntity(userId, habitId);
        return toDto(habit);
    }

    public HabitResponseDto createHabit(String userId, CreateHabitDto dto) {
        scheduleService.validateSchedule(dto);

        String now = Instant.now().toString();
        Habit habit = new Habit();
        habit.setId(UUID.randomUUID().toString());
        habit.setUserId(userId);
        habit.setTitle(dto.getTitle().trim());
        habit.setNotes(dto.getNotes() != null ? dto.getNotes().trim() : "");
        habit.setDurationValue(dto.getDurationValue() != null ? dto.getDurationValue() : 15);
        habit.setDurationUnit(dto.getDurationUnit() != null ? dto.getDurationUnit() : "minutes");
        habit.setFrequency(dto.getFrequency());
        habit.setStartDate(dto.getStartDate());
        habit.setEndDate(dto.getEndDate());
        habit.setOneTimeDate("one-time".equals(dto.getFrequency())
                ? (dto.getOneTimeDate() != null ? dto.getOneTimeDate() : dto.getStartDate())
                : null);
        habit.setWeekdays(dto.getWeekdays() != null ? new ArrayList<>(dto.getWeekdays()) : new ArrayList<>());
        habit.setExtraDates(dto.getExtraDates() != null ? new ArrayList<>(dto.getExtraDates()) : new ArrayList<>());
        habit.setActive(true);
        habit.setCreatedAt(now);
        habit.setUpdatedAt(now);

        Habit saved = habitRepository.save(habit);
        return toDto(saved);
    }

    public HabitResponseDto updateHabit(String userId, String habitId, UpdateHabitDto dto) {
        Habit habit = getHabitEntity(userId, habitId);
        scheduleService.validateSchedule(habit, dto);

        if (dto.getTitle() != null) habit.setTitle(dto.getTitle().trim());
        if (dto.getNotes() != null) habit.setNotes(dto.getNotes().trim());
        if (dto.getDurationValue() != null) habit.setDurationValue(dto.getDurationValue());
        if (dto.getDurationUnit() != null) habit.setDurationUnit(dto.getDurationUnit());
        if (dto.getFrequency() != null) habit.setFrequency(dto.getFrequency());
        if (dto.getStartDate() != null) habit.setStartDate(dto.getStartDate());
        if (dto.getEndDate() != null) habit.setEndDate(dto.getEndDate());
        if (dto.getOneTimeDate() != null) habit.setOneTimeDate(dto.getOneTimeDate());
        if (dto.getWeekdays() != null) habit.setWeekdays(new ArrayList<>(dto.getWeekdays()));
        if (dto.getExtraDates() != null) habit.setExtraDates(new ArrayList<>(dto.getExtraDates()));
        if (dto.getIsActive() != null) habit.setActive(dto.getIsActive());

        habit.setUpdatedAt(Instant.now().toString());
        Habit saved = habitRepository.save(habit);
        return toDto(saved);
    }

    public void deleteHabit(String userId, String habitId) {
        Habit habit = getHabitEntity(userId, habitId);
        habitRepository.delete(habit);
    }

    public CompletionResponseDto recordCompletion(String userId, String habitId, String date, String referenceDate) {
        String today = referenceDate != null ? referenceDate : DateUtils.getTodayUTC();

        if (!DateUtils.isValidDateString(date)) {
            throw new BadRequestException("Invalid completion date: '" + date + "'. Must be in YYYY-MM-DD format.");
        }

        if (DateUtils.compareDates(date, today) > 0) {
            throw new BadRequestException("Cannot record completions for future dates (received: " + date + ", today is: " + today + ").");
        }

        Habit habit = getHabitEntity(userId, habitId);

        if (!habit.isActive()) {
            throw new BadRequestException("Cannot record completion for an inactive habit.");
        }

        if (DateUtils.compareDates(date, habit.getStartDate()) < 0) {
            throw new BadRequestException("Cannot record completion before habit start date (" + habit.getStartDate() + ").");
        }

        if (habit.getEndDate() != null && DateUtils.compareDates(date, habit.getEndDate()) > 0) {
            throw new BadRequestException("Cannot record completion after habit end date (" + habit.getEndDate() + ").");
        }

        if (completionRepository.existsByHabitIdAndDate(habit.getId(), date)) {
            throw new ConflictException("Completion has already been recorded for habit '" + habit.getTitle() + "' on date " + date + ".");
        }

        Completion completion = new Completion(habit, date);
        completionRepository.save(completion);

        habit.setUpdatedAt(Instant.now().toString());
        habitRepository.save(habit);

        HabitResponseDto habitDto = toDto(habit);
        Set<String> completedDates = habitDto.getCompletions().keySet();
        StreakResponseDto streak = streakService.calculateStreak(habit, completedDates, today);

        return new CompletionResponseDto(habitDto, streak);
    }

    public CompletionResponseDto removeCompletion(String userId, String habitId, String date, String referenceDate) {
        String today = referenceDate != null ? referenceDate : DateUtils.getTodayUTC();

        if (!DateUtils.isValidDateString(date)) {
            throw new BadRequestException("Invalid date: '" + date + "'. Must be in YYYY-MM-DD format.");
        }

        Habit habit = getHabitEntity(userId, habitId);

        Completion completion = completionRepository.findByHabitIdAndDate(habit.getId(), date)
                .orElseThrow(() -> new NotFoundException("No completion record found for habit '" + habit.getTitle() + "' on date " + date + "."));

        completionRepository.delete(completion);

        habit.setUpdatedAt(Instant.now().toString());
        habitRepository.save(habit);

        HabitResponseDto habitDto = toDto(habit);
        Set<String> completedDates = habitDto.getCompletions().keySet();
        StreakResponseDto streak = streakService.calculateStreak(habit, completedDates, today);

        return new CompletionResponseDto(habitDto, streak);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCompletions(String userId, String habitId) {
        Habit habit = getHabitEntity(userId, habitId);
        List<Completion> list = completionRepository.findByHabitId(habit.getId());
        Map<String, Boolean> completions = new LinkedHashMap<>();
        for (Completion c : list) {
            completions.put(c.getDate(), true);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("habitId", habit.getId());
        result.put("completions", completions);
        return result;
    }

    @Transactional(readOnly = true)
    public StreakResponseDto getStreak(String userId, String habitId, String referenceDate) {
        Habit habit = getHabitEntity(userId, habitId);
        List<Completion> completions = completionRepository.findByHabitId(habit.getId());
        Set<String> completedDates = completions.stream().map(Completion::getDate).collect(Collectors.toSet());
        return streakService.calculateStreak(habit, completedDates, referenceDate);
    }

    @Transactional(readOnly = true)
    public List<MissedOccurrenceDto> getMissedOccurrences(String userId, String habitId,
                                                           String fromDate, String toDate, String referenceDate) {
        String today = referenceDate != null ? referenceDate : DateUtils.getTodayUTC();
        List<Habit> habits;
        if (habitId != null) {
            habits = Collections.singletonList(getHabitEntity(userId, habitId));
        } else {
            habits = habitRepository.findByUserIdAndIsActive(userId, true);
        }

        List<MissedOccurrenceDto> missed = new ArrayList<>();
        String yesterday = DateUtils.addDays(today, -1);

        for (Habit habit : habits) {
            String defaultStart = DateUtils.addDays(today, -30);
            String habitStart = "one-time".equals(habit.getFrequency())
                    ? (habit.getOneTimeDate() != null ? habit.getOneTimeDate() : habit.getStartDate())
                    : habit.getStartDate();

            String start = fromDate != null ? fromDate : (DateUtils.compareDates(habitStart, defaultStart) < 0 ? defaultStart : habitStart);
            if (DateUtils.compareDates(start, habitStart) < 0) {
                start = habitStart;
            }

            String end = toDate != null ? toDate : yesterday;
            if (DateUtils.compareDates(end, yesterday) > 0) {
                end = yesterday;
            }

            if (habit.getEndDate() != null && DateUtils.compareDates(end, habit.getEndDate()) > 0) {
                end = habit.getEndDate();
            }

            if (DateUtils.compareDates(start, end) > 0) {
                continue;
            }

            List<String> scheduledDates = scheduleService.getScheduledDates(habit, start, end);
            List<Completion> completions = completionRepository.findByHabitId(habit.getId());
            Set<String> completedDates = completions.stream().map(Completion::getDate).collect(Collectors.toSet());
            List<Recovery> recoveries = recoveryRepository.findByHabitId(habit.getId());
            Map<String, Recovery> recoveryMap = recoveries.stream().collect(Collectors.toMap(Recovery::getDate, r -> r));

            for (String d : scheduledDates) {
                if (DateUtils.compareDates(d, today) < 0 && !completedDates.contains(d)) {
                    Recovery rec = recoveryMap.get(d);
                    RecoveryRecordDto recDto = rec != null ? toRecoveryDto(rec) : null;
                    missed.add(new MissedOccurrenceDto(
                            habit.getId(),
                            habit.getTitle(),
                            d,
                            recDto != null,
                            recDto
                    ));
                }
            }
        }

        return missed;
    }

    public RecordRecoveryResponseDto recordRecovery(String userId, String habitId, String date,
                                                     RecoveryRequestDto input, String referenceDate) {
        String today = referenceDate != null ? referenceDate : DateUtils.getTodayUTC();

        if (!DateUtils.isValidDateString(date)) {
            throw new BadRequestException("Invalid date: '" + date + "'. Must be in YYYY-MM-DD format.");
        }

        if (DateUtils.compareDates(date, today) >= 0) {
            throw new BadRequestException("Recovery can only be recorded for past missed occurrences (date must be before " + today + ").");
        }

        Habit habit = getHabitEntity(userId, habitId);

        if (!scheduleService.isScheduledOn(habit, date)) {
            throw new BadRequestException("Habit '" + habit.getTitle() + "' was not scheduled on " + date + ". Recovery cannot be recorded.");
        }

        if (completionRepository.existsByHabitIdAndDate(habit.getId(), date)) {
            throw new BadRequestException("Habit '" + habit.getTitle() + "' was completed on " + date + ". Recovery is only for missed occurrences.");
        }

        RecoveryRecordDto recordDto = recoveryService.validateAndBuildRecord(input);

        Recovery recovery = recoveryRepository.findByHabitIdAndDate(habit.getId(), date)
                .orElse(new Recovery());

        recovery.setHabit(habit);
        recovery.setDate(date);
        recovery.setPromptShown(recordDto.isPromptShown());
        recovery.setHandled(recordDto.isHandled());
        recovery.setReason(recordDto.getReason());
        recovery.setExplanation(recordDto.getExplanation());
        recovery.setAdjustment(recordDto.getAdjustment());
        recovery.setActionTaken(recordDto.getActionTaken());
        recovery.setRecordedAt(recordDto.getRecordedAt());

        recoveryRepository.save(recovery);

        habit.setUpdatedAt(Instant.now().toString());
        habitRepository.save(habit);

        HabitResponseDto habitDto = toDto(habit);
        RecoverySuggestionDto suggestion = recoveryService.getRecoverySuggestion(recordDto.getReason());

        return new RecordRecoveryResponseDto(habitDto, recordDto, suggestion);
    }

    @Transactional(readOnly = true)
    public Map<String, RecoveryRecordDto> getRecoveries(String userId, String habitId) {
        Habit habit = getHabitEntity(userId, habitId);
        List<Recovery> list = recoveryRepository.findByHabitId(habit.getId());
        Map<String, RecoveryRecordDto> map = new LinkedHashMap<>();
        for (Recovery r : list) {
            map.put(r.getDate(), toRecoveryDto(r));
        }
        return map;
    }

    public HabitResponseDto toDto(Habit habit) {
        HabitResponseDto dto = new HabitResponseDto();
        dto.setId(habit.getId());
        dto.setUserId(habit.getUserId());
        dto.setTitle(habit.getTitle());
        dto.setNotes(habit.getNotes() != null ? habit.getNotes() : "");
        dto.setDurationValue(habit.getDurationValue());
        dto.setDurationUnit(habit.getDurationUnit());
        dto.setFrequency(habit.getFrequency());
        dto.setStartDate(habit.getStartDate());
        dto.setEndDate(habit.getEndDate());
        dto.setOneTimeDate(habit.getOneTimeDate());
        dto.setWeekdays(habit.getWeekdays() != null ? new ArrayList<>(habit.getWeekdays()) : new ArrayList<>());
        dto.setExtraDates(habit.getExtraDates() != null ? new ArrayList<>(habit.getExtraDates()) : new ArrayList<>());
        dto.setActive(habit.isActive());
        dto.setCreatedAt(habit.getCreatedAt());
        dto.setUpdatedAt(habit.getUpdatedAt());

        // Completions map
        List<Completion> completions = completionRepository.findByHabitId(habit.getId());
        Map<String, Boolean> compMap = new LinkedHashMap<>();
        for (Completion c : completions) {
            compMap.put(c.getDate(), true);
        }
        dto.setCompletions(compMap);

        // Recoveries map
        List<Recovery> recoveries = recoveryRepository.findByHabitId(habit.getId());
        Map<String, RecoveryRecordDto> recMap = new LinkedHashMap<>();
        for (Recovery r : recoveries) {
            recMap.put(r.getDate(), toRecoveryDto(r));
        }
        dto.setRecoveries(recMap);

        return dto;
    }

    private RecoveryRecordDto toRecoveryDto(Recovery r) {
        return new RecoveryRecordDto(
                r.isPromptShown(),
                r.isHandled(),
                r.getReason(),
                r.getExplanation(),
                r.getAdjustment(),
                r.getActionTaken(),
                r.getRecordedAt()
        );
    }
}
