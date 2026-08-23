package com.microgig.service;

import com.microgig.payload.response.LiveStatsResponse;

public interface LiveStatsService {

    void recordJobView(Long workRequestId, String viewerIdentifier);

    LiveStatsResponse getLiveStats(Long workRequestId);
}
