package com.habittracker.interceptor;

import com.habittracker.exception.BadRequestException;
import com.habittracker.exception.NotFoundException;
import com.habittracker.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final UserService userService;

    public AuthInterceptor(UserService userService) {
        this.userService = userService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Skip CORS pre-flight requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String rawHeader = request.getHeader("X-User-Id");
        if (rawHeader == null || rawHeader.trim().isEmpty()) {
            throw new BadRequestException(
                    "Missing required 'X-User-Id' header. Please provide a valid demo user ID (e.g., 'user-001', 'user-002', 'user-003')."
            );
        }

        String cleanUserId = rawHeader.trim();
        if (!userService.userExists(cleanUserId)) {
            throw new NotFoundException(
                    String.format("Demo user '%s' not found. Please use one of the seeded users: user-001, user-002, or user-003.", cleanUserId)
            );
        }

        request.setAttribute("userId", cleanUserId);
        return true;
    }
}
