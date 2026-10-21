package com.habittracker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.habittracker.repository.CompletionRepository;
import com.habittracker.repository.HabitRepository;
import com.habittracker.repository.RecoveryRepository;
import com.habittracker.repository.UserRepository;
import com.habittracker.seed.DatabaseSeeder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HabitRepository habitRepository;

    @Autowired
    private CompletionRepository completionRepository;

    @Autowired
    private RecoveryRepository recoveryRepository;

    @Autowired
    private DatabaseSeeder databaseSeeder;

    @BeforeEach
    void setUp() {
        recoveryRepository.deleteAll();
        completionRepository.deleteAll();
        habitRepository.deleteAll();
        userRepository.deleteAll();
        databaseSeeder.run();
    }

    // -------------------------------------------------------------
    // System & Public Endpoints
    // -------------------------------------------------------------

    @Test
    @DisplayName("GET /api/health returns 200 with service info")
    void testHealth() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("habit-logic-backend"))
                .andExpect(jsonPath("$.version").value("1.0.0"));
    }

    @Test
    @DisplayName("GET /api/users returns list of seeded demo users")
    void testListUsers() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(3))))
                .andExpect(jsonPath("$.data[*].id", hasItems("user-001", "user-002", "user-003")));
    }

    @Test
    @DisplayName("GET /api/recovery/suggestions returns deterministic options")
    void testRecoverySuggestions() throws Exception {
        mockMvc.perform(get("/api/recovery/suggestions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[*].reason", hasItems("exhausted", "procrastinating")));
    }

    // -------------------------------------------------------------
    // Demo Identity & Header Validation (Option C)
    // -------------------------------------------------------------

    @Test
    @DisplayName("rejects requests with missing X-User-Id header with 400 Bad Request")
    void testMissingUserIdHeader() throws Exception {
        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error", containsString("Missing required 'X-User-Id' header")));
    }

    @Test
    @DisplayName("rejects requests with unknown user ID with 404 Not Found")
    void testUnknownUserId() throws Exception {
        mockMvc.perform(get("/api/tasks")
                        .header("X-User-Id", "unknown-user-999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error", containsString("Demo user 'unknown-user-999' not found")));
    }

    // -------------------------------------------------------------
    // User Data Isolation (Strict Multi-Tenant Separation)
    // -------------------------------------------------------------

    @Test
    @DisplayName("ensures user-001 and user-002 see only their own habits")
    void testUserIsolation() throws Exception {
        mockMvc.perform(get("/api/tasks")
                        .header("X-User-Id", "user-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem("habit-101")))
                .andExpect(jsonPath("$.data[*].id", not(hasItem("habit-201"))));

        mockMvc.perform(get("/api/tasks")
                        .header("X-User-Id", "user-002"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem("habit-201")))
                .andExpect(jsonPath("$.data[*].id", not(hasItem("habit-101"))));
    }

    @Test
    @DisplayName("prevents user-002 from accessing or completing user-001 habit (404)")
    void testPreventCrossUserAccess() throws Exception {
        // user-002 tries to get user-001's habit-101
        mockMvc.perform(get("/api/tasks/habit-101")
                        .header("X-User-Id", "user-002"))
                .andExpect(status().isNotFound());

        // user-002 tries to record completion for user-001's habit-101
        mockMvc.perform(post("/api/tasks/habit-101/complete")
                        .header("X-User-Id", "user-002")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"2026-10-20\"}"))
                .andExpect(status().isNotFound());

        // user-002 tries to delete user-001's habit-101
        mockMvc.perform(delete("/api/tasks/habit-101")
                        .header("X-User-Id", "user-002"))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------
    // Route Conflict Avoidance
    // -------------------------------------------------------------

    @Test
    @DisplayName("GET /api/tasks/missed resolves to missed occurrences rather than :id parameter")
    void testMissedRouteNotId() throws Exception {
        mockMvc.perform(get("/api/tasks/missed?referenceDate=2026-10-21")
                        .header("X-User-Id", "user-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").exists())
                .andExpect(jsonPath("$.data").isArray());
    }

    // -------------------------------------------------------------
    // Habit Lifecycle & Operations
    // -------------------------------------------------------------

    @Test
    @DisplayName("creates, reads, updates, and deletes a habit via REST API")
    void testHabitCrud() throws Exception {
        // 1. Create
        String createJson = """
                {
                  "title": "Daily Meditation",
                  "notes": "Mindful breathing",
                  "durationValue": 15,
                  "durationUnit": "minutes",
                  "frequency": "daily",
                  "startDate": "2026-10-01"
                }
                """;

        MvcResult createResult = mockMvc.perform(post("/api/tasks")
                        .header("X-User-Id", "user-003")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").exists())
                .andReturn();

        JsonNode createNode = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String newId = createNode.path("data").path("id").asText();

        // 2. Read
        mockMvc.perform(get("/api/tasks/" + newId)
                        .header("X-User-Id", "user-003"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Daily Meditation"));

        // 3. Update
        String updateJson = """
                {
                  "title": "Morning Mindful Meditation",
                  "durationValue": 20
                }
                """;
        mockMvc.perform(patch("/api/tasks/" + newId)
                        .header("X-User-Id", "user-003")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Morning Mindful Meditation"))
                .andExpect(jsonPath("$.data.durationValue").value(20));

        // 4. Record Completion
        String completeJson = """
                {
                  "date": "2026-10-20",
                  "referenceDate": "2026-10-20"
                }
                """;
        mockMvc.perform(post("/api/tasks/" + newId + "/complete")
                        .header("X-User-Id", "user-003")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(completeJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.streak.currentStreak").value(1));

        // 5. Query Streak
        mockMvc.perform(get("/api/tasks/" + newId + "/streak?referenceDate=2026-10-20")
                        .header("X-User-Id", "user-003"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentStreak").value(1))
                .andExpect(jsonPath("$.data.longestStreak").value(1));

        // 6. Delete
        mockMvc.perform(delete("/api/tasks/" + newId)
                        .header("X-User-Id", "user-003"))
                .andExpect(status().isOk());

        // 7. Verify Gone
        mockMvc.perform(get("/api/tasks/" + newId)
                        .header("X-User-Id", "user-003"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("records recovery record linked to habit and returns suggestion")
    void testRecordRecoveryApi() throws Exception {
        String recoveryJson = """
                {
                  "date": "2026-10-15",
                  "reason": "procrastinating",
                  "explanation": "Got stuck reading articles online",
                  "actionTaken": "focus",
                  "referenceDate": "2026-10-21"
                }
                """;

        mockMvc.perform(post("/api/tasks/habit-101/recovery")
                        .header("X-User-Id", "user-001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(recoveryJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.recovery.reason").value("procrastinating"))
                .andExpect(jsonPath("$.data.suggestion.shorterMinutes").value(5));
    }

    @Test
    @DisplayName("supports POST /api/tasks/:id/completions and DELETE /api/tasks/:id/completions/:date")
    void testCompletionsEndpointsAliases() throws Exception {
        String compJson = """
                {
                  "date": "2026-10-21",
                  "referenceDate": "2026-10-21"
                }
                """;
        mockMvc.perform(post("/api/tasks/habit-101/completions")
                        .header("X-User-Id", "user-001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(compJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(delete("/api/tasks/habit-101/completions/2026-10-21")
                        .header("X-User-Id", "user-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
