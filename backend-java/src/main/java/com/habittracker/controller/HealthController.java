package com.habittracker.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public Map<String, Object> health() {
        double uptime = ManagementFactory.getRuntimeMXBean().getUptime() / 1000.0;
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ok");
        response.put("service", "habit-logic-backend");
        response.put("uptime", uptime);
        response.put("timestamp", Instant.now().toString());
        response.put("version", "1.0.0");
        return response;
    }
}
