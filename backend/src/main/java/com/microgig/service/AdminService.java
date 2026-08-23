package com.microgig.service;

import com.microgig.payload.request.ModerationDecisionRequest;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.WorkResponse;

import java.util.List;
import java.util.Map;

public interface AdminService {

    Map<String, Object> getSystemStats();

    MessageResponse toggleUserLock(Long userId, boolean locked);

    List<WorkResponse> getFlaggedWorkRequests();

    WorkResponse moderateWorkRequest(Long adminId, Long workRequestId, ModerationDecisionRequest request);
}
