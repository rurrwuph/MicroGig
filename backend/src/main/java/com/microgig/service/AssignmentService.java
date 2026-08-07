package com.microgig.service;

import com.microgig.payload.request.CancelAssignmentRequest;
import com.microgig.payload.request.PayWorkRequest;
import com.microgig.payload.request.RevisionRequest;
import com.microgig.payload.request.SubmitWorkRequest;
import com.microgig.payload.response.CancelAssignmentResponse;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.WorkAssignmentResponse;

import java.util.List;

public interface AssignmentService {

    List<WorkAssignmentResponse> getMyAssignments(Long freelancerId);

    List<WorkAssignmentResponse> getClientAssignments(Long clientId);

    WorkAssignmentResponse acceptWork(Long freelancerId, Long workRequestId);

    WorkAssignmentResponse submitWork(Long freelancerId, Long workRequestId, SubmitWorkRequest submitRequest);

    CancelAssignmentResponse cancelAssignment(Long freelancerId, Long workRequestId, CancelAssignmentRequest cancelRequest);

    WorkAssignmentResponse requestRevision(Long clientId, Long workRequestId, RevisionRequest revisionRequest);

    MessageResponse payForWork(Long clientId, Long workRequestId, PayWorkRequest payRequest);
}
