package com.habittracker.repository;

import com.habittracker.entity.Recovery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecoveryRepository extends JpaRepository<Recovery, Long> {

    List<Recovery> findByHabitId(String habitId);

    Optional<Recovery> findByHabitIdAndDate(String habitId, String date);

    boolean existsByHabitIdAndDate(String habitId, String date);
}
