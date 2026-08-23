package com.microgig.service;

import com.microgig.model.WorkStatus;
import com.microgig.payload.request.ManualFlagRequest;
import com.microgig.payload.request.ModerationDecisionRequest;
import com.microgig.payload.response.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface AdminService {

    Map<String, Object> getSystemStats();

    MessageResponse toggleUserLock(Long userId, boolean locked);

    List<WorkResponse> getFlaggedWorkRequests();

    WorkResponse moderateWorkRequest(Long adminId, Long workRequestId, ModerationDecisionRequest request);

    Page<AdminUserResponse> getUsersDrillDown(String role, Boolean locked, Pageable pageable);

    List<ClientAnalyticsResponse> getClientsAnalytics();

    List<FreelancerAnalyticsResponse> getFreelancersAnalytics();

    Page<WorkResponse> getWorkRequestsDrillDown(WorkStatus status, Pageable pageable);

    WorkResponse flagWorkRequestManually(Long adminId, Long workRequestId, ManualFlagRequest request);
}
