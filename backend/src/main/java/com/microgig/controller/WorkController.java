package com.microgig.controller;

import com.microgig.payload.request.AppealRequest;
import com.microgig.payload.request.WorkCreateRequest;
import com.microgig.payload.request.WorkUpdateRequest;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.WorkResponse;
import com.microgig.security.UserDetailsImpl;
import com.microgig.service.WorkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/work")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
public class WorkController {

    private final WorkService workService;
    private final com.microgig.service.LiveStatsService liveStatsService;

    /**
     * GET /api/work
     * Returns all available work requests.
     */
    @GetMapping
    public ResponseEntity<List<WorkResponse>> getAllWork() {
        List<WorkResponse> response = workService.getAllWork();
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/work/{id}
     * Returns a specific work request by ID and records live view.
     */
    @GetMapping("/{id}")
    public ResponseEntity<WorkResponse> getWorkById(@PathVariable Long id,
                                                    @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkResponse response = workService.getWorkById(id);
        String viewer = userDetails != null ? "user:" + userDetails.getId() : "anon:" + System.currentTimeMillis();
        liveStatsService.recordJobView(id, viewer);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/work/{id}/live-stats
     * Returns active viewers in last 60s and total unique viewers.
     */
    @GetMapping("/{id}/live-stats")
    public ResponseEntity<com.microgig.payload.response.LiveStatsResponse> getLiveStats(@PathVariable Long id,
                                                                                        @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails != null) {
            liveStatsService.recordJobView(id, "user:" + userDetails.getId());
        }
        com.microgig.payload.response.LiveStatsResponse response = liveStatsService.getLiveStats(id);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/work/my
     * Returns all work requests posted by the authenticated client.
     */
    @GetMapping("/my")
    public ResponseEntity<List<WorkResponse>> getMyPostedJobs(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<WorkResponse> response = workService.getMyPostedJobs(userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/work
     * Creates a new work request by the authenticated client.
     */
    @PostMapping
    public ResponseEntity<WorkResponse> createWorkRequest(@Valid @RequestBody WorkCreateRequest request,
                                                          @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkResponse response = workService.createWork(userDetails.getId(), request);
        return ResponseEntity.ok(response);
    }

    /**
     * PUT /api/work/{id}
     * Client modifies their posted job.
     */
    @PutMapping("/{id}")
    public ResponseEntity<WorkResponse> updateWorkRequest(@PathVariable Long id,
                                                          @Valid @RequestBody WorkUpdateRequest request,
                                                          @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkResponse response = workService.updateWork(userDetails.getId(), id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/work/{id}/appeal
     * Client submits an appeal for a FLAGGED post.
     */
    @PostMapping("/{id}/appeal")
    public ResponseEntity<WorkResponse> appealWorkRequest(@PathVariable Long id,
                                                          @Valid @RequestBody(required = false) AppealRequest request,
                                                          @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkResponse response = workService.appealWork(userDetails.getId(), id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/work/{id}
     * Client cancels their own OPEN job post.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> cancelWorkRequest(@PathVariable Long id,
                                                             @AuthenticationPrincipal UserDetailsImpl userDetails) {
        MessageResponse response = workService.cancelWork(userDetails.getId(), id);
        return ResponseEntity.ok(response);
    }
}
