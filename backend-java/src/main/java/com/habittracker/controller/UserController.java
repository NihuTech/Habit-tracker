package com.habittracker.controller;

import com.habittracker.dto.ApiResponse;
import com.habittracker.dto.UserResponseDto;
import com.habittracker.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * GET /api/users
     * Lists all available demo users.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponseDto>>> listUsers() {
        List<UserResponseDto> users = userService.listUsers();
        return ResponseEntity.ok(ApiResponse.ok(
                "Demo users available for testing. Provide your chosen ID in the X-User-Id header.",
                users
        ));
    }

    /**
     * GET /api/users/:id
     * Get specific demo user profile info.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponseDto>> getUser(@PathVariable("id") String id) {
        Optional<UserResponseDto> userOpt = userService.findUserById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(String.format("Demo user '%s' not found.", id)));
        }
        return ResponseEntity.ok(ApiResponse.ok(userOpt.get()));
    }
}
