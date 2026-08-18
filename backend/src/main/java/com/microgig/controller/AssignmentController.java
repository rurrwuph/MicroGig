package com.microgig.controller;

import com.microgig.payload.request.CancelAssignmentRequest;
import com.microgig.payload.request.PayWorkRequest;
import com.microgig.payload.request.RevisionRequest;
import com.microgig.payload.request.SubmitWorkRequest;
import com.microgig.payload.response.CancelAssignmentResponse;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.WorkAssignmentResponse;
import com.microgig.security.UserDetailsImpl;
import com.microgig.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assignments")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    /**
     * GET /api/assignments/my
     * Returns all WorkAssignments belonging to the authenticated FREELANCER.
     */
    @GetMapping("/my")
    public ResponseEntity<List<WorkAssignmentResponse>> getMyAssignments(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<WorkAssignmentResponse> response = assignmentService.getMyAssignments(userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/assignments/client
     * Returns all WorkAssignments for jobs posted by the authenticated CLIENT.
     */
    @GetMapping("/client")
    public ResponseEntity<List<WorkAssignmentResponse>> getClientAssignments(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<WorkAssignmentResponse> response = assignmentService.getClientAssignments(userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/assignments/{requestId}/accept
     * Freelancer accepts an OPEN work request. Path var = WorkRequest ID.
     */
    @PostMapping("/{requestId}/accept")
    public ResponseEntity<WorkAssignmentResponse> acceptWork(@PathVariable Long requestId,
                                                            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkAssignmentResponse response = assignmentService.acceptWork(userDetails.getId(), requestId);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/assignments/{workRequestId}/submit
     * Freelancer submits deliverables.
     */
    @PostMapping("/{workRequestId}/submit")
    public ResponseEntity<WorkAssignmentResponse> submitWork(@PathVariable Long workRequestId,
                                                            @Valid @RequestBody(required = false) SubmitWorkRequest submitRequest,
                                                            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkAssignmentResponse response = assignmentService.submitWork(userDetails.getId(), workRequestId, submitRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/assignments/{workRequestId}/cancel
     * Freelancer cancels work with a reason.
     */
    @PostMapping("/{workRequestId}/cancel")
    public ResponseEntity<CancelAssignmentResponse> cancelAssignment(@PathVariable Long workRequestId,
                                                                    @Valid @RequestBody CancelAssignmentRequest cancelRequest,
                                                                    @AuthenticationPrincipal UserDetailsImpl userDetails) {
        CancelAssignmentResponse response = assignmentService.cancelAssignment(userDetails.getId(), workRequestId, cancelRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/assignments/{workRequestId}/revision
     * Client requests changes/revision with feedback.
     */
    @PostMapping("/{workRequestId}/revision")
    public ResponseEntity<WorkAssignmentResponse> requestRevision(@PathVariable Long workRequestId,
                                                                 @Valid @RequestBody RevisionRequest revisionRequest,
                                                                 @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkAssignmentResponse response = assignmentService.requestRevision(userDetails.getId(), workRequestId, revisionRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/assignments/{workRequestId}/pay
     * Client releases payment. Admin receives 0.1% platform fee, freelancer receives 99.9%.
     */
    @PostMapping("/{workRequestId}/pay")
    public ResponseEntity<MessageResponse> payForWork(@PathVariable Long workRequestId,
                                                      @Valid @RequestBody(required = false) PayWorkRequest payRequest,
                                                      @AuthenticationPrincipal UserDetailsImpl userDetails) {
        MessageResponse response = assignmentService.payForWork(userDetails.getId(), workRequestId, payRequest);
        return ResponseEntity.ok(response);
    }
}
