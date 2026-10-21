package com.habittracker;

import com.habittracker.dto.CompletionResponseDto;
import com.habittracker.dto.CreateHabitDto;
import com.habittracker.dto.HabitResponseDto;
import com.habittracker.dto.MissedOccurrenceDto;
import com.habittracker.dto.RecordRecoveryResponseDto;
import com.habittracker.dto.RecoveryRequestDto;
import com.habittracker.dto.StreakResponseDto;
import com.habittracker.exception.BadRequestException;
import com.habittracker.exception.ConflictException;
import com.habittracker.exception.NotFoundException;
import com.habittracker.repository.CompletionRepository;
import com.habittracker.repository.HabitRepository;
import com.habittracker.repository.RecoveryRepository;
import com.habittracker.repository.UserRepository;
import com.habittracker.seed.DatabaseSeeder;
import com.habittracker.service.HabitService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class HabitServiceTest {

    @Autowired
    private HabitService habitService;

    @Autowired
    private HabitRepository habitRepository;

    @Autowired
    private CompletionRepository completionRepository;

    @Autowired
    private RecoveryRepository recoveryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DatabaseSeeder databaseSeeder;

    private final String testUser = "user-001";

    @BeforeEach
    void setUp() {
        recoveryRepository.deleteAll();
        completionRepository.deleteAll();
        habitRepository.deleteAll();
        userRepository.deleteAll();
        databaseSeeder.run();
    }

    @Test
    @DisplayName("creates a habit with validated fields")
    void testCreateHabit() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Morning Walk");
        dto.setNotes("Walk around park for 20 minutes");
        dto.setDurationValue(20);
        dto.setDurationUnit("minutes");
        dto.setFrequency("daily");
        dto.setStartDate("2026-10-01");

        HabitResponseDto habit = habitService.createHabit(testUser, dto);

        assertNotNull(habit.getId());
        assertEquals(testUser, habit.getUserId());
        assertEquals("Morning Walk", habit.getTitle());
        assertTrue(habit.isActive());
        assertTrue(habit.getCompletions().isEmpty());
        assertTrue(habit.getRecoveries().isEmpty());
    }

    @Test
    @DisplayName("rejects invalid schedule when creating habit")
    void testRejectInvalidScheduleOnCreate() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("");
        dto.setFrequency("daily");
        dto.setStartDate("2026-10-01");

        assertThrows(BadRequestException.class, () -> habitService.createHabit(testUser, dto));
    }

    @Test
    @DisplayName("retrieves habit by ID for authorized user")
    void testGetHabit() {
        List<HabitResponseDto> habits = habitService.listHabits(testUser, null);
        assertFalse(habits.isEmpty());
        HabitResponseDto target = habits.get(0);

        HabitResponseDto retrieved = habitService.getHabit(testUser, target.getId());
        assertEquals(target.getId(), retrieved.getId());
        assertEquals(target.getTitle(), retrieved.getTitle());
    }

    @Test
    @DisplayName("throws NotFoundError for non-existent habit")
    void testGetNonExistentHabit() {
        assertThrows(NotFoundException.class, () -> habitService.getHabit(testUser, "non-existent-id"));
    }

    @Test
    @DisplayName("records valid completion and returns updated streak")
    void testRecordValidCompletion() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Drink Herbal Tea");
        dto.setFrequency("daily");
        dto.setStartDate("2026-10-10");

        HabitResponseDto created = habitService.createHabit(testUser, dto);

        String refDate = "2026-10-15";
        CompletionResponseDto resp = habitService.recordCompletion(testUser, created.getId(), "2026-10-15", refDate);

        assertTrue(resp.getHabit().getCompletions().containsKey("2026-10-15"));
        assertEquals(1, resp.getStreak().getCurrentStreak());
        assertTrue(resp.getStreak().isCompletedToday());
    }

    @Test
    @DisplayName("rejects duplicate completions on the same date with ConflictError (409)")
    void testRejectDuplicateCompletion() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Daily Journal");
        dto.setFrequency("daily");
        dto.setStartDate("2026-10-10");

        HabitResponseDto created = habitService.createHabit(testUser, dto);
        String refDate = "2026-10-12";
        habitService.recordCompletion(testUser, created.getId(), "2026-10-12", refDate);

        assertThrows(ConflictException.class, () ->
                habitService.recordCompletion(testUser, created.getId(), "2026-10-12", refDate)
        );
    }

    @Test
    @DisplayName("rejects future completions relative to reference date")
    void testRejectFutureCompletion() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Meditation");
        dto.setFrequency("daily");
        dto.setStartDate("2026-10-01");

        HabitResponseDto created = habitService.createHabit(testUser, dto);

        assertThrows(BadRequestException.class, () ->
                habitService.recordCompletion(testUser, created.getId(), "2026-10-16", "2026-10-15")
        );
    }

    @Test
    @DisplayName("rejects invalid date formats")
    void testRejectInvalidDateFormat() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Meditation");
        dto.setFrequency("daily");
        dto.setStartDate("2026-10-01");

        HabitResponseDto created = habitService.createHabit(testUser, dto);

        assertThrows(BadRequestException.class, () ->
                habitService.recordCompletion(testUser, created.getId(), "15/10/2026", "2026-10-20")
        );
    }

    @Test
    @DisplayName("safely removes historical completion and recalculates streak")
    void testRemoveHistoricalCompletion() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Reading");
        dto.setFrequency("daily");
        dto.setStartDate("2026-10-01");

        HabitResponseDto created = habitService.createHabit(testUser, dto);

        // Complete 3 consecutive days
        habitService.recordCompletion(testUser, created.getId(), "2026-10-01", "2026-10-03");
        habitService.recordCompletion(testUser, created.getId(), "2026-10-02", "2026-10-03");
        habitService.recordCompletion(testUser, created.getId(), "2026-10-03", "2026-10-03");

        StreakResponseDto streakBefore = habitService.getStreak(testUser, created.getId(), "2026-10-03");
        assertEquals(3, streakBefore.getCurrentStreak());

        // Remove middle day 2026-10-02 (e.g. historical correction)
        CompletionResponseDto respAfter = habitService.removeCompletion(testUser, created.getId(), "2026-10-02", "2026-10-03");
        assertEquals(1, respAfter.getStreak().getCurrentStreak());
    }

    @Test
    @DisplayName("detects scheduled occurrences that were not completed")
    void testDetectMissedOccurrences() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Study Math");
        dto.setFrequency("daily");
        dto.setStartDate("2026-10-10");

        HabitResponseDto created = habitService.createHabit(testUser, dto);

        // Complete 10-10, miss 10-11 and 10-12. Reference date is 2026-10-13.
        habitService.recordCompletion(testUser, created.getId(), "2026-10-10", "2026-10-13");

        List<MissedOccurrenceDto> missed = habitService.getMissedOccurrences(
                testUser, created.getId(), null, null, "2026-10-13"
        );

        List<String> missedDates = missed.stream().map(MissedOccurrenceDto::getDate).toList();
        assertTrue(missedDates.contains("2026-10-11"));
        assertTrue(missedDates.contains("2026-10-12"));
        assertFalse(missedDates.contains("2026-10-10")); // Completed
        assertFalse(missedDates.contains("2026-10-13")); // In progress (today)
        assertFalse(missedDates.contains("2026-10-14")); // Future
    }

    @Test
    @DisplayName("does not classify unscheduled days as missed for weekly habits")
    void testDoNotClassifyUnscheduledDaysAsMissed() {
        // Weekly habit on Mondays only (1)
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Weekly Team Sync Review");
        dto.setFrequency("weekly");
        dto.setStartDate("2026-10-01");
        dto.setWeekdays(Collections.singletonList(1));

        HabitResponseDto created = habitService.createHabit(testUser, dto);

        // 2026-10-12 is Monday. 10-13 (Tue), 10-14 (Wed) are unscheduled. Reference: 10-15 (Thu)
        List<MissedOccurrenceDto> missed = habitService.getMissedOccurrences(
                testUser, created.getId(), "2026-10-12", "2026-10-14", "2026-10-15"
        );

        List<String> missedDates = missed.stream().map(MissedOccurrenceDto::getDate).toList();
        assertEquals(Collections.singletonList("2026-10-12"), missedDates);
    }

    @Test
    @DisplayName("records recovery record with deterministic suggestion")
    void testRecordRecovery() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Coding Exercise");
        dto.setFrequency("daily");
        dto.setStartDate("2026-10-10");

        HabitResponseDto created = habitService.createHabit(testUser, dto);

        RecoveryRequestDto recoveryInput = new RecoveryRequestDto();
        recoveryInput.setReason("exhausted");
        recoveryInput.setExplanation("Overworked at the office");
        recoveryInput.setAdjustment("Will do 2-minute version tomorrow");
        recoveryInput.setActionTaken("shorter");

        RecordRecoveryResponseDto resp = habitService.recordRecovery(
                testUser,
                created.getId(),
                "2026-10-14",
                recoveryInput,
                "2026-10-15"
        );

        assertEquals("exhausted", resp.getRecovery().getReason());
        assertTrue(resp.getRecovery().isHandled());
        assertEquals("exhausted", resp.getSuggestion().getReason());
        assertEquals(2, resp.getSuggestion().getShorterMinutes());
        assertNotNull(resp.getHabit().getRecoveries().get("2026-10-14"));
    }

    @Test
    @DisplayName("CRITICAL: recovery action does NOT mark habit completed and does NOT inflate streak")
    void testRecoveryNeverMarksCompleteOrInflatesStreak() {
        CreateHabitDto dto = new CreateHabitDto();
        dto.setTitle("Floss Teeth");
        dto.setFrequency("daily");
        dto.setStartDate("2026-10-10");

        HabitResponseDto created = habitService.createHabit(testUser, dto);

        // Reference date is 2026-10-15
        // Complete 10-10, 10-11. Miss 10-12, 10-13, 10-14.
        habitService.recordCompletion(testUser, created.getId(), "2026-10-10", "2026-10-15");
        habitService.recordCompletion(testUser, created.getId(), "2026-10-11", "2026-10-15");

        // Record recovery for 2026-10-14
        RecoveryRequestDto rec = new RecoveryRequestDto();
        rec.setReason("no-time");
        habitService.recordRecovery(testUser, created.getId(), "2026-10-14", rec, "2026-10-15");

        HabitResponseDto habitAfter = habitService.getHabit(testUser, created.getId());
        assertFalse(habitAfter.getCompletions().containsKey("2026-10-14"));

        StreakResponseDto streak = habitService.getStreak(testUser, created.getId(), "2026-10-15");
        assertEquals(0, streak.getCurrentStreak());
    }
}
