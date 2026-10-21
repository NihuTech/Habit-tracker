package com.habittracker.service;

import com.habittracker.dto.UserResponseDto;
import com.habittracker.entity.User;
import com.habittracker.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserResponseDto> listUsers() {
        return userRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    public Optional<UserResponseDto> findUserById(String id) {
        return userRepository.findById(id).map(this::toDto);
    }

    public boolean userExists(String id) {
        return userRepository.existsById(id);
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
