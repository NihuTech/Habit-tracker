package com.habittracker.controller;

import com.habittracker.dto.ApiResponse;
import com.habittracker.dto.RecordRecoveryResponseDto;
import com.habittracker.dto.RecoveryRequestDto;
import com.habittracker.dto.RecoverySuggestionDto;
import com.habittracker.service.HabitService;
import com.habittracker.service.RecoveryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recovery")
public class RecoveryController {

    private final RecoveryService recoveryService;
    private final HabitService habitService;

    public RecoveryController(RecoveryService recoveryService, HabitService habitService) {
        this.recoveryService = recoveryService;
        this.habitService = habitService;
    }

    /**
     * GET /api/recovery/suggestions
     */
    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<RecoverySuggestionDto>>> getSuggestions() {
        List<RecoverySuggestionDto> list = recoveryService.listRecoverySuggestions();
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /**
     * GET /api/recovery/suggestions/:reason
     */
    @GetMapping("/suggestions/{reason}")
    public ResponseEntity<ApiResponse<RecoverySuggestionDto>> getSuggestionForReason(@PathVariable("reason") String reason) {
        RecoverySuggestionDto suggestion = recoveryService.getRecoverySuggestion(reason);
        return ResponseEntity.ok(ApiResponse.ok(suggestion));
    }

    /**
     * POST /api/recovery/:id
     * Direct recovery submission by habit ID
     */
    @PostMapping("/{id}")
    public ResponseEntity<ApiResponse<RecordRecoveryResponseDto>> recordRecovery(
            @PathVariable("id") String habitId,
            @RequestBody RecoveryRequestDto body,
            HttpServletRequest request) {
        String userId = (String) request.getAttribute("userId");
        RecordRecoveryResponseDto response = habitService.recordRecovery(
                userId,
                habitId,
                body.getDate(),
                body,
                body.getReferenceDate()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }
}
