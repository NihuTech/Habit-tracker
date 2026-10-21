package com.habittracker.repository;

import com.habittracker.entity.Habit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HabitRepository extends JpaRepository<Habit, String> {

    List<Habit> findByUserId(String userId);

    List<Habit> findByUserIdAndIsActive(String userId, boolean isActive);

    Optional<Habit> findByIdAndUserId(String id, String userId);

    void deleteByIdAndUserId(String id, String userId);
}
