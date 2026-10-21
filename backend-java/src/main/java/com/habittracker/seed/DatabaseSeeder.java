package com.habittracker.seed;

import com.habittracker.entity.Completion;
import com.habittracker.entity.Habit;
import com.habittracker.entity.Recovery;
import com.habittracker.entity.User;
import com.habittracker.repository.CompletionRepository;
import com.habittracker.repository.HabitRepository;
import com.habittracker.repository.RecoveryRepository;
import com.habittracker.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSeeder.class);

    private final UserRepository userRepository;
    private final HabitRepository habitRepository;
    private final CompletionRepository completionRepository;
    private final RecoveryRepository recoveryRepository;

    public DatabaseSeeder(UserRepository userRepository,
                          HabitRepository habitRepository,
                          CompletionRepository completionRepository,
                          RecoveryRepository recoveryRepository) {
        this.userRepository = userRepository;
        this.habitRepository = habitRepository;
        this.completionRepository = completionRepository;
        this.recoveryRepository = recoveryRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0 || habitRepository.count() > 0) {
            log.info("Database already contains data; skipping seeding.");
            return;
        }

        log.info("Database is empty. Seeding initial demo users, habits, completions, and recoveries...");

        // 1. Seed Demo Users
        User user1 = new User("user-001", "Alex Johnson", "alex.johnson@example.com", "Demo User 1 - Daily habits and active streaks");
        User user2 = new User("user-002", "Taylor Smith", "taylor.smith@example.com", "Demo User 2 - Custom workout and weekly routines");
        User user3 = new User("user-003", "Jordan Lee", "jordan.lee@example.com", "Demo User 3 - New user with a clean slate");
        userRepository.saveAll(Arrays.asList(user1, user2, user3));

        // 2. Seed Habit 101 for user-001
        Habit h101 = new Habit();
        h101.setId("habit-101");
        h101.setUserId("user-001");
        h101.setTitle("Drink 8 glasses of water");
        h101.setNotes("Stay hydrated throughout the day.");
        h101.setDurationValue(5);
        h101.setDurationUnit("minutes");
        h101.setFrequency("daily");
        h101.setStartDate("2026-10-01");
        h101.setEndDate(null);
        h101.setOneTimeDate(null);
        h101.setWeekdays(new ArrayList<>());
        h101.setExtraDates(new ArrayList<>());
        h101.setActive(true);
        h101.setCreatedAt("2026-10-01T08:00:00.000Z");
        h101.setUpdatedAt("2026-10-20T20:00:00.000Z");
        habitRepository.save(h101);

        completionRepository.saveAll(Arrays.asList(
                new Completion(h101, "2026-10-18"),
                new Completion(h101, "2026-10-19"),
                new Completion(h101, "2026-10-20")
        ));

        // 3. Seed Habit 102 for user-001
        Habit h102 = new Habit();
        h102.setId("habit-102");
        h102.setUserId("user-001");
        h102.setTitle("Morning Yoga");
        h102.setNotes("Stretch and breathe for 15 minutes.");
        h102.setDurationValue(15);
        h102.setDurationUnit("minutes");
        h102.setFrequency("daily");
        h102.setStartDate("2026-10-10");
        h102.setEndDate(null);
        h102.setOneTimeDate(null);
        h102.setWeekdays(new ArrayList<>());
        h102.setExtraDates(new ArrayList<>());
        h102.setActive(true);
        h102.setCreatedAt("2026-10-10T07:30:00.000Z");
        h102.setUpdatedAt("2026-10-20T21:00:00.000Z");
        habitRepository.save(h102);

        completionRepository.saveAll(Arrays.asList(
                new Completion(h102, "2026-10-15"),
                new Completion(h102, "2026-10-16"),
                new Completion(h102, "2026-10-19"),
                new Completion(h102, "2026-10-20")
        ));

        Recovery rec102 = new Recovery(
                h102,
                "2026-10-17",
                true,
                true,
                "exhausted",
                "Worked late on Friday evening.",
                "Took a short rest and drank water.",
                "shorter",
                "2026-10-18T09:00:00.000Z"
        );
        recoveryRepository.save(rec102);

        // 4. Seed Habit 201 for user-002
        Habit h201 = new Habit();
        h201.setId("habit-201");
        h201.setUserId("user-002");
        h201.setTitle("Gym Strength Workout");
        h201.setNotes("Focus on compound exercises (Mon, Wed, Fri).");
        h201.setDurationValue(45);
        h201.setDurationUnit("minutes");
        h201.setFrequency("custom");
        h201.setStartDate("2026-10-01");
        h201.setEndDate(null);
        h201.setOneTimeDate(null);
        h201.setWeekdays(new ArrayList<>(Arrays.asList(1, 3, 5)));
        h201.setExtraDates(new ArrayList<>());
        h201.setActive(true);
        h201.setCreatedAt("2026-10-01T09:00:00.000Z");
        h201.setUpdatedAt("2026-10-19T18:00:00.000Z");
        habitRepository.save(h201);

        completionRepository.saveAll(Arrays.asList(
                new Completion(h201, "2026-10-12"),
                new Completion(h201, "2026-10-14"),
                new Completion(h201, "2026-10-16"),
                new Completion(h201, "2026-10-19")
        ));

        log.info("Database seeding successfully completed.");
    }
}
