package com.microgig.controller;

import com.microgig.payload.response.LeaderboardResponse;
import com.microgig.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leaderboard")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    /**
     * GET /api/leaderboard/top-freelancers
     * Real-time Redis-backed top freelancers leaderboard.
     */
    @GetMapping("/top-freelancers")
    public ResponseEntity<LeaderboardResponse> getTopFreelancers() {
        LeaderboardResponse response = leaderboardService.getTopFreelancers();
        return ResponseEntity.ok(response);
    }
}
