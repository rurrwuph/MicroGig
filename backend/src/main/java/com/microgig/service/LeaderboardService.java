package com.microgig.service;

import com.microgig.payload.response.LeaderboardResponse;

public interface LeaderboardService {

    void recordCompletedGig(String username);

    void recordRating(String username, Double score);

    LeaderboardResponse getTopFreelancers();

    void seedLeaderboardIfEmpty();
}
