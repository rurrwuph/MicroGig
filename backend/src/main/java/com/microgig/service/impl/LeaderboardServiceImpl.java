package com.microgig.service.impl;

import com.microgig.model.AssignmentStatus;
import com.microgig.model.Role;
import com.microgig.model.User;
import com.microgig.model.WorkAssignment;
import com.microgig.payload.response.LeaderboardResponse;
import com.microgig.repository.UserRepository;
import com.microgig.repository.WorkAssignmentRepository;
import com.microgig.service.LeaderboardService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LeaderboardServiceImpl implements LeaderboardService {

    private final StringRedisTemplate stringRedisTemplate;
    private final UserRepository userRepository;
    private final WorkAssignmentRepository assignmentRepository;

    private static final String KEY_RATING = "leaderboard:freelancers:rating";
    private static final String KEY_GIGS = "leaderboard:freelancers:gigs_completed";

    @Override
    public void recordCompletedGig(String username) {
        if (username == null || username.isBlank()) return;
        try {
            stringRedisTemplate.opsForZSet().incrementScore(KEY_GIGS, username, 1.0);
        } catch (Exception e) {
            log.warn("Failed to increment completed gigs in Redis for {}: {}", username, e.getMessage());
        }
    }

    @Override
    public void recordRating(String username, Double score) {
        if (username == null || username.isBlank() || score == null) return;
        try {
            stringRedisTemplate.opsForZSet().add(KEY_RATING, username, score);
        } catch (Exception e) {
            log.warn("Failed to set rating in Redis for {}: {}", username, e.getMessage());
        }
    }

    @Override
    public LeaderboardResponse getTopFreelancers() {
        try {
            Set<ZSetOperations.TypedTuple<String>> ratingTuples =
                    stringRedisTemplate.opsForZSet().reverseRangeWithScores(KEY_RATING, 0, 4);

            Set<ZSetOperations.TypedTuple<String>> gigTuples =
                    stringRedisTemplate.opsForZSet().reverseRangeWithScores(KEY_GIGS, 0, 4);

            if ((ratingTuples == null || ratingTuples.isEmpty()) && (gigTuples == null || gigTuples.isEmpty())) {
                seedLeaderboardIfEmpty();
                ratingTuples = stringRedisTemplate.opsForZSet().reverseRangeWithScores(KEY_RATING, 0, 4);
                gigTuples = stringRedisTemplate.opsForZSet().reverseRangeWithScores(KEY_GIGS, 0, 4);
            }

            List<LeaderboardResponse.FreelancerRankDto> topRated = mapTuplesToDto(ratingTuples);
            List<LeaderboardResponse.FreelancerRankDto> topCompleted = mapTuplesToDto(gigTuples);

            return LeaderboardResponse.builder()
                    .topRated(topRated)
                    .topCompleted(topCompleted)
                    .build();
        } catch (Exception e) {
            log.warn("Failed to fetch Redis leaderboard: {}", e.getMessage());
            return LeaderboardResponse.builder()
                    .topRated(Collections.emptyList())
                    .topCompleted(Collections.emptyList())
                    .build();
        }
    }

    private List<LeaderboardResponse.FreelancerRankDto> mapTuplesToDto(Set<ZSetOperations.TypedTuple<String>> tuples) {
        if (tuples == null || tuples.isEmpty()) return Collections.emptyList();

        List<LeaderboardResponse.FreelancerRankDto> list = new ArrayList<>();
        int rank = 1;

        for (ZSetOperations.TypedTuple<String> tuple : tuples) {
            String username = tuple.getValue();
            Double score = tuple.getScore();

            String fullName = username;
            Optional<User> userOpt = userRepository.findByUsername(username);
            if (userOpt.isPresent() && userOpt.get().getFullName() != null && !userOpt.get().getFullName().isBlank()) {
                fullName = userOpt.get().getFullName();
            }

            list.add(LeaderboardResponse.FreelancerRankDto.builder()
                    .username(username)
                    .fullName(fullName)
                    .score(score != null ? score : 0.0)
                    .rank(rank++)
                    .build());
        }

        return list;
    }

    @Override
    @PostConstruct
    @Transactional(readOnly = true)
    public void seedLeaderboardIfEmpty() {
        try {
            Long ratingCount = stringRedisTemplate.opsForZSet().zCard(KEY_RATING);
            Long gigCount = stringRedisTemplate.opsForZSet().zCard(KEY_GIGS);

            if ((ratingCount == null || ratingCount == 0) || (gigCount == null || gigCount == 0)) {
                log.info("Seeding Redis Leaderboard from database records...");

                List<User> freelancers = userRepository.findAll().stream()
                        .filter(u -> u.getRole() == Role.ROLE_FREELANCER)
                        .collect(Collectors.toList());

                for (User f : freelancers) {
                    List<WorkAssignment> assignments = assignmentRepository.findByFreelancer(f);
                    long completedCount = assignments.stream()
                            .filter(a -> a.getStatus() == AssignmentStatus.COMPLETED)
                            .count();

                    List<WorkAssignment> rated = assignments.stream()
                            .filter(a -> a.getStatus() == AssignmentStatus.COMPLETED && a.getRating() != null)
                            .collect(Collectors.toList());

                    if (completedCount > 0) {
                        stringRedisTemplate.opsForZSet().add(KEY_GIGS, f.getUsername(), (double) completedCount);
                    }

                    if (!rated.isEmpty()) {
                        double avg = rated.stream().mapToInt(WorkAssignment::getRating).average().orElse(5.0);
                        stringRedisTemplate.opsForZSet().add(KEY_RATING, f.getUsername(), avg);
                    }
                }
                log.info("Redis Leaderboard successfully seeded.");
            }
        } catch (Exception e) {
            log.warn("Leaderboard seeding warning: {}", e.getMessage());
        }
    }
}
