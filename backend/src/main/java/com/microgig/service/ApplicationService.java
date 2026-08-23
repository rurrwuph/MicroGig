package com.microgig.service;

import com.microgig.payload.request.WorkApplicationRequest;
import com.microgig.payload.response.WorkApplicationResponse;

import java.util.List;

public interface ApplicationService {

    WorkApplicationResponse applyForWork(Long freelancerId, Long workRequestId, WorkApplicationRequest request);

    List<WorkApplicationResponse> getApplicationsForWork(Long userId, Long workRequestId);

    List<WorkApplicationResponse> getMyApplications(Long freelancerId);

    WorkApplicationResponse acceptApplication(Long clientId, Long workRequestId, Long applicationId);

    WorkApplicationResponse rejectApplication(Long clientId, Long workRequestId, Long applicationId);
}
