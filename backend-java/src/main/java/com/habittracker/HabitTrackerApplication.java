package com.habittracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;

@SpringBootApplication
public class HabitTrackerApplication {

    public static void main(String[] args) {
        // Ensure data directory exists for H2 file database
        File dataDir = new File("./data");
        if (!dataDir.exists()) {
            dataDir.mkdirs();
        }

        SpringApplication.run(HabitTrackerApplication.class, args);
    }
}
