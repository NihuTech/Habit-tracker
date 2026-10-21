package com.habittracker;

import com.habittracker.dto.AuthResponse;
import com.habittracker.dto.LoginRequest;
import com.habittracker.dto.SignupRequest;
import com.habittracker.exception.BadRequestException;
import com.habittracker.exception.ConflictException;
import com.habittracker.exception.UnauthorizedException;
import com.habittracker.repository.SessionRepository;
import com.habittracker.repository.UserRepository;
import com.habittracker.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SessionRepository sessionRepository;

    private static final String VALID_NAME     = "Alice";
    private static final String VALID_EMAIL    = "alice@example.com";
    private static final String VALID_PASSWORD = "secret123";

    @BeforeEach
    void setUp() {
        sessionRepository.deleteAll();
        userRepository.deleteAll();
    }

    // -------------------------------------------------------------------------
    // signup – happy path
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("signup – valid input creates user and returns token + user")
    void signup_validInput_returnsAuthResponse() {
        SignupRequest req = new SignupRequest(VALID_NAME, VALID_EMAIL, VALID_PASSWORD);
        AuthResponse res = authService.signup(req);

        assertNotNull(res.getToken(), "token must not be null");
        assertNotNull(res.getUser(), "user must not be null");
        assertEquals(VALID_NAME, res.getUser().getName());
        assertEquals(VALID_EMAIL, res.getUser().getEmail());
        // password hash must NOT leak into the response DTO
        assertNull(res.getUser().getDescription()); // description is a separate optional field
    }

    @Test
    @DisplayName("signup – email is trimmed and lower-cased before storage")
    void signup_emailNormalized() {
        SignupRequest req = new SignupRequest(VALID_NAME, "  Alice@Example.COM  ", VALID_PASSWORD);
        AuthResponse res = authService.signup(req);
        assertEquals("alice@example.com", res.getUser().getEmail());
    }

    @Test
    @DisplayName("signup – session token is persisted")
    void signup_sessionPersisted() {
        SignupRequest req = new SignupRequest(VALID_NAME, VALID_EMAIL, VALID_PASSWORD);
        AuthResponse res = authService.signup(req);
        assertTrue(sessionRepository.findByToken(res.getToken()).isPresent(),
                "session must be stored in the DB");
    }

    // -------------------------------------------------------------------------
    // signup – name validation
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("signup – missing name throws 400")
    void signup_missingName_throws400() {
        SignupRequest req = new SignupRequest(null, VALID_EMAIL, VALID_PASSWORD);
        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.signup(req));
        assertTrue(ex.getMessage().toLowerCase().contains("name"), ex.getMessage());
    }

    @Test
    @DisplayName("signup – blank name throws 400")
    void signup_blankName_throws400() {
        SignupRequest req = new SignupRequest("   ", VALID_EMAIL, VALID_PASSWORD);
        assertThrows(BadRequestException.class, () -> authService.signup(req));
    }

    // -------------------------------------------------------------------------
    // signup – email validation
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("signup – missing email throws 400")
    void signup_missingEmail_throws400() {
        SignupRequest req = new SignupRequest(VALID_NAME, null, VALID_PASSWORD);
        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.signup(req));
        assertTrue(ex.getMessage().toLowerCase().contains("email"), ex.getMessage());
    }

    @Test
    @DisplayName("signup – email without domain dot (a@b) throws 400")
    void signup_emailNoDomainDot_throws400() {
        SignupRequest req = new SignupRequest(VALID_NAME, "user@nodot", VALID_PASSWORD);
        assertThrows(BadRequestException.class, () -> authService.signup(req));
    }

    @Test
    @DisplayName("signup – email ending with dot (a@b.) throws 400")
    void signup_emailTrailingDot_throws400() {
        SignupRequest req = new SignupRequest(VALID_NAME, "user@domain.", VALID_PASSWORD);
        assertThrows(BadRequestException.class, () -> authService.signup(req));
    }

    @Test
    @DisplayName("signup – email without @ throws 400")
    void signup_emailNoAtSign_throws400() {
        SignupRequest req = new SignupRequest(VALID_NAME, "notanemail", VALID_PASSWORD);
        assertThrows(BadRequestException.class, () -> authService.signup(req));
    }

    @Test
    @DisplayName("signup – email exceeding 254 chars throws 400")
    void signup_emailTooLong_throws400() {
        String longLocal = "a".repeat(245);
        String tooLong = longLocal + "@example.com"; // > 254 chars
        SignupRequest req = new SignupRequest(VALID_NAME, tooLong, VALID_PASSWORD);
        assertThrows(BadRequestException.class, () -> authService.signup(req));
    }

    // -------------------------------------------------------------------------
    // signup – password validation
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("signup – password shorter than 8 chars throws 400")
    void signup_shortPassword_throws400() {
        SignupRequest req = new SignupRequest(VALID_NAME, VALID_EMAIL, "short");
        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.signup(req));
        assertTrue(ex.getMessage().toLowerCase().contains("password"), ex.getMessage());
    }

    @Test
    @DisplayName("signup – null password throws 400")
    void signup_nullPassword_throws400() {
        SignupRequest req = new SignupRequest(VALID_NAME, VALID_EMAIL, null);
        assertThrows(BadRequestException.class, () -> authService.signup(req));
    }

    @Test
    @DisplayName("signup – password exactly 8 chars is accepted")
    void signup_exactMinPassword_accepted() {
        SignupRequest req = new SignupRequest(VALID_NAME, VALID_EMAIL, "exactly8");
        assertDoesNotThrow(() -> authService.signup(req));
    }

    // -------------------------------------------------------------------------
    // signup – duplicate email → 409
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("signup – duplicate email throws 409 Conflict")
    void signup_duplicateEmail_throws409() {
        authService.signup(new SignupRequest(VALID_NAME, VALID_EMAIL, VALID_PASSWORD));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> authService.signup(new SignupRequest("Bob", VALID_EMAIL, "another123")));
        assertTrue(ex.getMessage().toLowerCase().contains("email"), ex.getMessage());
    }

    @Test
    @DisplayName("signup – duplicate email is case-insensitive (409)")
    void signup_duplicateEmailCaseInsensitive_throws409() {
        authService.signup(new SignupRequest(VALID_NAME, "alice@example.com", VALID_PASSWORD));

        assertThrows(ConflictException.class,
                () -> authService.signup(new SignupRequest("Bob", "ALICE@EXAMPLE.COM", "another123")));
    }

    // -------------------------------------------------------------------------
    // login – happy path
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("login – correct credentials return token + user")
    void login_correctCredentials_returnsAuthResponse() {
        authService.signup(new SignupRequest(VALID_NAME, VALID_EMAIL, VALID_PASSWORD));

        AuthResponse res = authService.login(new LoginRequest(VALID_EMAIL, VALID_PASSWORD));
        assertNotNull(res.getToken());
        assertEquals(VALID_EMAIL, res.getUser().getEmail());
    }

    @Test
    @DisplayName("login – email is trimmed and lower-cased before lookup")
    void login_emailNormalized_succeeds() {
        authService.signup(new SignupRequest(VALID_NAME, VALID_EMAIL, VALID_PASSWORD));

        AuthResponse res = authService.login(new LoginRequest("  ALICE@EXAMPLE.COM  ", VALID_PASSWORD));
        assertNotNull(res.getToken());
    }

    // -------------------------------------------------------------------------
    // login – failure → always 401 with one generic message
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("login – wrong password throws 401")
    void login_wrongPassword_throws401() {
        authService.signup(new SignupRequest(VALID_NAME, VALID_EMAIL, VALID_PASSWORD));

        UnauthorizedException ex = assertThrows(UnauthorizedException.class,
                () -> authService.login(new LoginRequest(VALID_EMAIL, "wrongpassword")));
        // Message must be generic (not reveal which field was wrong)
        assertEquals("Invalid email or password.", ex.getMessage());
    }

    @Test
    @DisplayName("login – unknown email throws 401 with generic message")
    void login_unknownEmail_throws401() {
        UnauthorizedException ex = assertThrows(UnauthorizedException.class,
                () -> authService.login(new LoginRequest("nobody@example.com", VALID_PASSWORD)));
        assertEquals("Invalid email or password.", ex.getMessage());
    }

    @Test
    @DisplayName("login – null password throws 401")
    void login_nullPassword_throws401() {
        authService.signup(new SignupRequest(VALID_NAME, VALID_EMAIL, VALID_PASSWORD));
        assertThrows(UnauthorizedException.class,
                () -> authService.login(new LoginRequest(VALID_EMAIL, null)));
    }

    @Test
    @DisplayName("login – null request throws 401")
    void login_nullRequest_throws401() {
        assertThrows(UnauthorizedException.class, () -> authService.login(null));
    }

    // -------------------------------------------------------------------------
    // getCurrentUser
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("getCurrentUser – valid token returns user DTO")
    void getCurrentUser_validToken_returnsUser() {
        AuthResponse signup = authService.signup(new SignupRequest(VALID_NAME, VALID_EMAIL, VALID_PASSWORD));
        var user = authService.getCurrentUser("Bearer " + signup.getToken());
        assertEquals(VALID_EMAIL, user.getEmail());
    }

    @Test
    @DisplayName("getCurrentUser – missing header throws 401")
    void getCurrentUser_missingHeader_throws401() {
        assertThrows(UnauthorizedException.class, () -> authService.getCurrentUser(null));
    }

    @Test
    @DisplayName("getCurrentUser – invalid token throws 401")
    void getCurrentUser_invalidToken_throws401() {
        assertThrows(UnauthorizedException.class,
                () -> authService.getCurrentUser("Bearer not-a-real-token"));
    }

    @Test
    @DisplayName("getCurrentUser – malformed header (no 'Bearer ') throws 401")
    void getCurrentUser_malformedHeader_throws401() {
        authService.signup(new SignupRequest(VALID_NAME, VALID_EMAIL, VALID_PASSWORD));
        assertThrows(UnauthorizedException.class,
                () -> authService.getCurrentUser("Token somevalue"));
    }

    // -------------------------------------------------------------------------
    // logout
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("logout – valid token deletes session")
    void logout_validToken_deletesSession() {
        AuthResponse signup = authService.signup(new SignupRequest(VALID_NAME, VALID_EMAIL, VALID_PASSWORD));
        String token = signup.getToken();

        authService.logout("Bearer " + token);

        assertFalse(sessionRepository.findByToken(token).isPresent(),
                "session must be deleted after logout");
    }

    @Test
    @DisplayName("logout – missing/invalid header is silently ignored (no exception)")
    void logout_missingHeader_silentlyIgnored() {
        assertDoesNotThrow(() -> authService.logout(null));
        assertDoesNotThrow(() -> authService.logout(""));
        assertDoesNotThrow(() -> authService.logout("Token bad"));
    }
}
