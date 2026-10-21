package com.habittracker.controller;

import com.habittracker.dto.ApiResponse;
import com.habittracker.dto.CompletionRequestDto;
import com.habittracker.dto.CompletionResponseDto;
import com.habittracker.dto.CreateHabitDto;
import com.habittracker.dto.HabitResponseDto;
import com.habittracker.dto.MissedOccurrenceDto;
import com.habittracker.dto.RecordRecoveryResponseDto;
import com.habittracker.dto.RecoveryRecordDto;
import com.habittracker.dto.RecoveryRequestDto;
import com.habittracker.dto.StreakResponseDto;
import com.habittracker.dto.UpdateHabitDto;
import com.habittracker.exception.BadRequestException;
import com.habittracker.service.HabitService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class HabitController {

    private final HabitService habitService;

    public HabitController(HabitService habitService) {
        this.habitService = habitService;
    }

    private String getUserId(HttpServletRequest request) {
        return (String) request.getAttribute("userId");
    }

    /**
     * GET /api/tasks/missed
     * Must be declared before /{id} to ensure precise matching
     */
    @GetMapping("/missed")
    public ResponseEntity<ApiResponse<List<MissedOccurrenceDto>>> getMissedOccurrences(
            @RequestParam(value = "habitId", required = false) String habitId,
            @RequestParam(value = "fromDate", required = false) String fromDate,
            @RequestParam(value = "toDate", required = false) String toDate,
            @RequestParam(value = "referenceDate", required = false) String referenceDate,
            HttpServletRequest request) {
        String userId = getUserId(request);
        List<MissedOccurrenceDto> missed = habitService.getMissedOccurrences(
                userId,
                habitId,
                fromDate,
                toDate,
                referenceDate
        );
        return ResponseEntity.ok(ApiResponse.okWithCount(missed.size(), missed));
    }

    /**
     * GET /api/tasks
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<HabitResponseDto>>> listHabits(
            @RequestParam(value = "isActive", required = false) Boolean isActive,
            HttpServletRequest request) {
        String userId = getUserId(request);
        List<HabitResponseDto> habits = habitService.listHabits(userId, isActive);
        return ResponseEntity.ok(ApiResponse.ok(habits));
    }

    /**
     * POST /api/tasks
     */
    @PostMapping
    public ResponseEntity<ApiResponse<HabitResponseDto>> createHabit(
            @RequestBody CreateHabitDto dto,
            HttpServletRequest request) {
        String userId = getUserId(request);
        HabitResponseDto created = habitService.createHabit(userId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    /**
     * GET /api/tasks/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<HabitResponseDto>> getHabit(
            @PathVariable("id") String id,
            HttpServletRequest request) {
        String userId = getUserId(request);
        HabitResponseDto habit = habitService.getHabit(userId, id);
        return ResponseEntity.ok(ApiResponse.ok(habit));
    }

    /**
     * PATCH /api/tasks/{id}
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<HabitResponseDto>> updateHabit(
            @PathVariable("id") String id,
            @RequestBody UpdateHabitDto dto,
            HttpServletRequest request) {
        String userId = getUserId(request);
        HabitResponseDto updated = habitService.updateHabit(userId, id, dto);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    /**
     * DELETE /api/tasks/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteHabit(
            @PathVariable("id") String id,
            HttpServletRequest request) {
        String userId = getUserId(request);
        habitService.deleteHabit(userId, id);
        return ResponseEntity.ok(ApiResponse.messageOnly("Habit deleted successfully."));
    }

    /**
     * POST /api/tasks/{id}/complete AND /api/tasks/{id}/completions
     */
    @PostMapping({"/{id}/complete", "/{id}/completions"})
    public ResponseEntity<ApiResponse<CompletionResponseDto>> recordCompletion(
            @PathVariable("id") String id,
            @RequestBody(required = false) CompletionRequestDto body,
            HttpServletRequest request) {
        String userId = getUserId(request);
        if (body == null || body.getDate() == null || body.getDate().trim().isEmpty()) {
            throw new BadRequestException("Field 'date' is required in request body (YYYY-MM-DD format).");
        }
        CompletionResponseDto result = habitService.recordCompletion(
                userId,
                id,
                body.getDate().trim(),
                body.getReferenceDate()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(result));
    }

    /**
     * DELETE /api/tasks/{id}/complete/{date} AND /api/tasks/{id}/completions/{date}
     */
    @DeleteMapping({"/{id}/complete/{date}", "/{id}/completions/{date}"})
    public ResponseEntity<ApiResponse<CompletionResponseDto>> removeCompletionWithDate(
            @PathVariable("id") String id,
            @PathVariable("date") String date,
            @RequestParam(value = "referenceDate", required = false) String queryRefDate,
            @RequestBody(required = false) CompletionRequestDto body,
            HttpServletRequest request) {
        String userId = getUserId(request);
        String refDate = (body != null && body.getReferenceDate() != null) ? body.getReferenceDate() : queryRefDate;
        CompletionResponseDto result = habitService.removeCompletion(userId, id, date, refDate);
        return ResponseEntity.ok(ApiResponse.ok(
                String.format("Completion for date %s removed successfully.", date),
                result
        ));
    }

    /**
     * DELETE /api/tasks/{id}/complete (with date in query or body)
     */
    @DeleteMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<CompletionResponseDto>> removeCompletion(
            @PathVariable("id") String id,
            @RequestParam(value = "date", required = false) String queryDate,
            @RequestParam(value = "referenceDate", required = false) String queryRefDate,
            @RequestBody(required = false) CompletionRequestDto body,
            HttpServletRequest request) {
        String userId = getUserId(request);
        String targetDate = (body != null && body.getDate() != null) ? body.getDate() : queryDate;
        if (targetDate == null || targetDate.trim().isEmpty()) {
            throw new BadRequestException("Completion date is required as URL parameter, body field, or query string.");
        }
        String refDate = (body != null && body.getReferenceDate() != null) ? body.getReferenceDate() : queryRefDate;
        CompletionResponseDto result = habitService.removeCompletion(userId, id, targetDate.trim(), refDate);
        return ResponseEntity.ok(ApiResponse.ok(
                String.format("Completion for date %s removed successfully.", targetDate.trim()),
                result
        ));
    }

    /**
     * GET /api/tasks/{id}/completions
     */
    @GetMapping("/{id}/completions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCompletions(
            @PathVariable("id") String id,
            HttpServletRequest request) {
        String userId = getUserId(request);
        Map<String, Object> result = habitService.getCompletions(userId, id);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * GET /api/tasks/{id}/streak
     */
    @GetMapping("/{id}/streak")
    public ResponseEntity<ApiResponse<StreakResponseDto>> getStreak(
            @PathVariable("id") String id,
            @RequestParam(value = "referenceDate", required = false) String referenceDate,
            HttpServletRequest request) {
        String userId = getUserId(request);
        StreakResponseDto streak = habitService.getStreak(userId, id, referenceDate);
        return ResponseEntity.ok(ApiResponse.ok(streak));
    }

    /**
     * POST /api/tasks/{id}/recovery
     */
    @PostMapping("/{id}/recovery")
    public ResponseEntity<ApiResponse<RecordRecoveryResponseDto>> recordRecovery(
            @PathVariable("id") String id,
            @RequestBody(required = false) RecoveryRequestDto body,
            HttpServletRequest request) {
        String userId = getUserId(request);
        if (body == null || body.getDate() == null || body.getDate().trim().isEmpty()) {
            throw new BadRequestException("Field 'date' is required in request body.");
        }
        RecordRecoveryResponseDto result = habitService.recordRecovery(
                userId,
                id,
                body.getDate().trim(),
                body,
                body.getReferenceDate()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(result));
    }

    /**
     * GET /api/tasks/{id}/recoveries
     */
    @GetMapping("/{id}/recoveries")
    public ResponseEntity<ApiResponse<Map<String, RecoveryRecordDto>>> getRecoveries(
            @PathVariable("id") String id,
            HttpServletRequest request) {
        String userId = getUserId(request);
        Map<String, RecoveryRecordDto> recoveries = habitService.getRecoveries(userId, id);
        return ResponseEntity.ok(ApiResponse.ok(recoveries));
    }
}
