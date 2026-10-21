package com.habittracker.service;

import com.habittracker.dto.RecoveryRecordDto;
import com.habittracker.dto.RecoveryRequestDto;
import com.habittracker.dto.RecoverySuggestionDto;
import com.habittracker.exception.BadRequestException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class RecoveryService {

    private static final List<String> VALID_REASONS = Arrays.asList(
            "exhausted",
            "upset",
            "procrastinating",
            "overwhelming",
            "no-time",
            "something-else"
    );

    private static final Map<String, RecoverySuggestionDto> RECOVERY_SUGGESTIONS;

    static {
        Map<String, RecoverySuggestionDto> map = new LinkedHashMap<>();
        map.put("exhausted", new RecoverySuggestionDto(
                "exhausted",
                "I felt exhausted",
                "Take a 10-minute rest and drink some water. If you're still tired, reschedule the habit. If you feel better, try a 2-minute version.",
                Arrays.asList("reschedule", "shorter"),
                2
        ));
        map.put("upset", new RecoverySuggestionDto(
                "upset",
                "I felt emotionally upset",
                "Pause for 2 minutes and take five slow breaths. Write down what's bothering you, then choose one small task—or give yourself permission to rest.",
                Arrays.asList("reschedule", "shorter"),
                2
        ));
        map.put("procrastinating", new RecoverySuggestionDto(
                "procrastinating",
                "I kept procrastinating or scrolling",
                "Put your phone away or enable Focus mode for 10 minutes. Open the task you need to do and work on it for just 5 minutes.",
                Arrays.asList("focus", "shorter"),
                5
        ));
        map.put("overwhelming", new RecoverySuggestionDto(
                "overwhelming",
                "The task felt too difficult or overwhelming",
                "Break the task into three smaller steps. Pick the easiest one and work on it for 5 minutes. Save the remaining steps for later.",
                Collections.singletonList("steps"),
                null
        ));
        map.put("no-time", new RecoverySuggestionDto(
                "no-time",
                "I didn't have enough time",
                "Choose a 2-minute version of your habit if possible. Otherwise, schedule a specific time tomorrow and set a reminder.",
                Arrays.asList("shorter", "reschedule", "reminder"),
                2
        ));
        map.put("something-else", new RecoverySuggestionDto(
                "something-else",
                "Something else",
                "Identify the main thing that stopped you. Select a new option, write a short explanation, or choose one adjustment to make your next attempt easier.",
                Arrays.asList("reschedule", "shorter", "steps", "reminder"),
                2
        ));
        RECOVERY_SUGGESTIONS = Collections.unmodifiableMap(map);
    }

    public RecoverySuggestionDto getRecoverySuggestion(String reason) {
        if (reason != null && RECOVERY_SUGGESTIONS.containsKey(reason)) {
            return RECOVERY_SUGGESTIONS.get(reason);
        }
        return RECOVERY_SUGGESTIONS.get("something-else");
    }

    public List<RecoverySuggestionDto> listRecoverySuggestions() {
        return Arrays.asList(
                RECOVERY_SUGGESTIONS.get("exhausted"),
                RECOVERY_SUGGESTIONS.get("upset"),
                RECOVERY_SUGGESTIONS.get("procrastinating"),
                RECOVERY_SUGGESTIONS.get("overwhelming"),
                RECOVERY_SUGGESTIONS.get("no-time"),
                RECOVERY_SUGGESTIONS.get("something-else")
        );
    }

    public RecoveryRecordDto validateAndBuildRecord(RecoveryRequestDto input) {
        if (input.getReason() == null || input.getReason().trim().isEmpty() || !VALID_REASONS.contains(input.getReason())) {
            throw new BadRequestException("Reason is required and must be one of: " + String.join(", ", VALID_REASONS) + ".");
        }

        boolean promptShown = input.getPromptShown() != null ? input.getPromptShown() : true;
        boolean handled = input.getHandled() != null ? input.getHandled() : true;
        String explanation = input.getExplanation() != null ? input.getExplanation().trim() : null;
        String adjustment = input.getAdjustment() != null ? input.getAdjustment().trim() : null;
        String actionTaken = input.getActionTaken() != null ? input.getActionTaken().trim() : null;
        String recordedAt = Instant.now().toString();

        return new RecoveryRecordDto(
                promptShown,
                handled,
                input.getReason(),
                explanation,
                adjustment,
                actionTaken,
                recordedAt
        );
    }
}
