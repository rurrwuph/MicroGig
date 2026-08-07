package com.microgig.service;

import com.microgig.payload.request.WorkCreateRequest;
import com.microgig.payload.request.WorkUpdateRequest;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.WorkResponse;

import java.util.List;

public interface WorkService {

    List<WorkResponse> getAllWork();

    List<WorkResponse> getMyPostedJobs(Long clientId);

    WorkResponse createWork(Long clientId, WorkCreateRequest request);

    WorkResponse updateWork(Long clientId, Long workId, WorkUpdateRequest request);

    MessageResponse cancelWork(Long clientId, Long workId);
}
