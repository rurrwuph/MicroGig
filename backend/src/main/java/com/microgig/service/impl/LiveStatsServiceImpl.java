package com.microgig.service.impl;

import com.microgig.payload.response.LiveStatsResponse;
import com.microgig.service.LiveStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveStatsServiceImpl implements LiveStatsService {

    private final StringRedisTemplate stringRedisTemplate;

    private static final String ACTIVE_VIEWERS_PREFIX = "active_viewers:work:";
    private static final String UNIQUE_VIEWERS_PREFIX = "work:";
    private static final String UNIQUE_VIEWERS_SUFFIX = ":viewers";
    private static final long ACTIVE_WINDOW_MS = 60000; // 60 seconds

    @Override
    public void recordJobView(Long workRequestId, String viewerIdentifier) {
        if (workRequestId == null || viewerIdentifier == null || viewerIdentifier.isBlank()) {
            return;
        }

        try {
            String activeKey = ACTIVE_VIEWERS_PREFIX + workRequestId;
            String uniqueKey = UNIQUE_VIEWERS_PREFIX + workRequestId + UNIQUE_VIEWERS_SUFFIX;

            long now = System.currentTimeMillis();

            // 1. Sliding Window in Redis Sorted Set for active concurrent viewers
            stringRedisTemplate.opsForZSet().add(activeKey, viewerIdentifier, (double) now);
            stringRedisTemplate.expire(activeKey, Duration.ofMinutes(10));

            // 2. Redis HyperLogLog for total unique cardinality
            stringRedisTemplate.opsForHyperLogLog().add(uniqueKey, viewerIdentifier);
        } catch (Exception e) {
            log.warn("Failed to record live Redis view stat for job {}: {}", workRequestId, e.getMessage());
        }
    }

    @Override
    public LiveStatsResponse getLiveStats(Long workRequestId) {
        if (workRequestId == null) {
            return LiveStatsResponse.builder().workRequestId(0L).activeViewers(0L).totalUniqueViewers(0L).build();
        }

        try {
            String activeKey = ACTIVE_VIEWERS_PREFIX + workRequestId;
            String uniqueKey = UNIQUE_VIEWERS_PREFIX + workRequestId + UNIQUE_VIEWERS_SUFFIX;

            long now = System.currentTimeMillis();
            long cutoff = now - ACTIVE_WINDOW_MS;

            // Remove members outside the 60-second window
            stringRedisTemplate.opsForZSet().removeRangeByScore(activeKey, 0, (double) cutoff);

            Long activeCount = stringRedisTemplate.opsForZSet().zCard(activeKey);
            Long uniqueCount = stringRedisTemplate.opsForHyperLogLog().size(uniqueKey);

            return LiveStatsResponse.builder()
                    .workRequestId(workRequestId)
                    .activeViewers(activeCount != null ? activeCount : 0L)
                    .totalUniqueViewers(uniqueCount != null ? uniqueCount : 0L)
                    .build();
        } catch (Exception e) {
            log.warn("Failed to fetch live Redis stats for job {}: {}", workRequestId, e.getMessage());
            return LiveStatsResponse.builder()
                    .workRequestId(workRequestId)
                    .activeViewers(0L)
                    .totalUniqueViewers(0L)
                    .build();
        }
    }
}
