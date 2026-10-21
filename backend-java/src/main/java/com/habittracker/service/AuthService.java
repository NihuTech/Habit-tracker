package com.habittracker.service;

import com.habittracker.dto.AuthResponse;
import com.habittracker.dto.LoginRequest;
import com.habittracker.dto.SignupRequest;
import com.habittracker.dto.UserResponseDto;
import com.habittracker.entity.Session;
import com.habittracker.entity.User;
import com.habittracker.exception.BadRequestException;
import com.habittracker.exception.ConflictException;
import com.habittracker.exception.UnauthorizedException;
import com.habittracker.repository.SessionRepository;
import com.habittracker.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@Transactional
public class AuthService {

    // Requires a dot in the domain part, at least 1 char before dot and at least 1 char after dot
    // e.g. rejects "a@b" and "a@b."
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)+$");
    private static final int MAX_EMAIL_LENGTH = 254;
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int SESSION_EXPIRATION_DAYS = 7;

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, SessionRepository sessionRepository) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    public AuthResponse signup(SignupRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body is required.");
        }

        // 1. Name validation
        String name = request.getName();
        if (name == null || name.trim().isEmpty()) {
            throw new BadRequestException("Name is required.");
        }
        name = name.trim();

        // 2. Email validation
        String cleanEmail = validateAndNormalizeEmail(request.getEmail());

        // 3. Password validation
        String password = request.getPassword();
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new BadRequestException(
                    String.format("Password must be at least %d characters long.", MIN_PASSWORD_LENGTH)
            );
        }

        // 4. Duplicate email check -> 409 Conflict
        if (userRepository.existsByEmail(cleanEmail)) {
            throw new ConflictException("Email already exists.");
        }

        // 5. Create user
        String userId = "user-" + UUID.randomUUID().toString();
        String passwordHash = passwordEncoder.encode(password);
        User user = new User(userId, name, cleanEmail, passwordHash, null);
        userRepository.save(user);

        // 6. Create session
        Session session = createSession(user.getId());

        return new AuthResponse(session.getToken(), toDto(user));
    }

    public AuthResponse login(LoginRequest request) {
        if (request == null) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        String email = request.getEmail();
        String password = request.getPassword();
        if (email == null || email.trim().isEmpty() || password == null || password.isEmpty()) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        String cleanEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        User user = userOpt.get();
        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        Session session = createSession(user.getId());
        return new AuthResponse(session.getToken(), toDto(user));
    }

    @Transactional(readOnly = true)
    public UserResponseDto getCurrentUser(String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        Session session = sessionRepository.findByToken(token)
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired session token."));

        if (session.isExpired()) {
            throw new UnauthorizedException("Session has expired. Please log in again.");
        }

        User user = userRepository.findById(session.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User not found for this session."));

        return toDto(user);
    }

    public void logout(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return;
        }
        String token = extractToken(authorizationHeader);
        sessionRepository.deleteByToken(token);
    }

    private Session createSession(String userId) {
        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(SESSION_EXPIRATION_DAYS, ChronoUnit.DAYS);
        Session session = new Session(token, userId, expiresAt);
        return sessionRepository.save(session);
    }

    private String validateAndNormalizeEmail(String rawEmail) {
        if (rawEmail == null || rawEmail.trim().isEmpty()) {
            throw new BadRequestException("Email is required.");
        }

        String cleanEmail = rawEmail.trim().toLowerCase();
        if (cleanEmail.length() > MAX_EMAIL_LENGTH) {
            throw new BadRequestException(
                    String.format("Email exceeds maximum allowed length of %d characters.", MAX_EMAIL_LENGTH)
            );
        }

        if (!EMAIL_PATTERN.matcher(cleanEmail).matches()) {
            throw new BadRequestException("Invalid email address format.");
        }

        return cleanEmail;
    }

    private String extractToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.trim().isEmpty()) {
            throw new UnauthorizedException("Missing Authorization header.");
        }

        String clean = authorizationHeader.trim();
        if (!clean.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header must use Bearer scheme.");
        }

        String token = clean.substring(7).trim();
        if (token.isEmpty()) {
            throw new UnauthorizedException("Empty session token in Authorization header.");
        }

        return token;
    }

    private UserResponseDto toDto(User user) {
        return new UserResponseDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getDescription()
        );
    }
}
