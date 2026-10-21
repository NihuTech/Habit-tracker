package com.habittracker.repository;

import com.habittracker.entity.Completion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompletionRepository extends JpaRepository<Completion, Long> {

    List<Completion> findByHabitId(String habitId);

    Optional<Completion> findByHabitIdAndDate(String habitId, String date);

    boolean existsByHabitIdAndDate(String habitId, String date);

    void deleteByHabitIdAndDate(String habitId, String date);
}
