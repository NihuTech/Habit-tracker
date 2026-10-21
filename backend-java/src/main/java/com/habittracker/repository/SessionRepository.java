package com.habittracker.repository;

import com.habittracker.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, String> {
    Optional<Session> findByToken(String token);
    void deleteByToken(String token);
    void deleteByUserId(String userId);
}
