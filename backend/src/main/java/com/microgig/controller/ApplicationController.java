package com.microgig.controller;

import com.microgig.payload.request.WorkApplicationRequest;
import com.microgig.payload.response.WorkApplicationResponse;
import com.microgig.security.UserDetailsImpl;
import com.microgig.service.ApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    /**
     * POST /api/work/{id}/apply
     * Freelancers submit proposals/bids for an open work request.
     */
    @PostMapping("/work/{id}/apply")
    @PreAuthorize("hasRole('FREELANCER')")
    public ResponseEntity<WorkApplicationResponse> applyForWork(@PathVariable Long id,
                                                                @Valid @RequestBody WorkApplicationRequest request,
                                                                @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkApplicationResponse response = applicationService.applyForWork(userDetails.getId(), id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/work/{id}/applications
     * Job creator (client) or admin views candidate applications.
     */
    @GetMapping({"/work/{id}/applications", "/work-requests/{id}/applications"})
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    public ResponseEntity<List<WorkApplicationResponse>> getApplicationsForWork(@PathVariable Long id,
                                                                               @AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<WorkApplicationResponse> response = applicationService.getApplicationsForWork(userDetails.getId(), id);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/applications/my
     * Freelancers view their submitted applications.
     */
    @GetMapping("/applications/my")
    @PreAuthorize("hasRole('FREELANCER')")
    public ResponseEntity<List<WorkApplicationResponse>> getMyApplications(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<WorkApplicationResponse> response = applicationService.getMyApplications(userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/work/{id}/applications/{appId}/accept
     * Client accepts a candidate's proposal.
     */
    @PostMapping({"/work/{id}/applications/{appId}/accept", "/work-requests/{id}/applications/{appId}/accept"})
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    public ResponseEntity<WorkApplicationResponse> acceptApplication(@PathVariable Long id,
                                                                     @PathVariable Long appId,
                                                                     @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkApplicationResponse response = applicationService.acceptApplication(userDetails.getId(), id, appId);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/work/{id}/applications/{appId}/reject
     * Client rejects a candidate's proposal.
     */
    @PostMapping({"/work/{id}/applications/{appId}/reject", "/work-requests/{id}/applications/{appId}/reject"})
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    public ResponseEntity<WorkApplicationResponse> rejectApplication(@PathVariable Long id,
                                                                     @PathVariable Long appId,
                                                                     @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkApplicationResponse response = applicationService.rejectApplication(userDetails.getId(), id, appId);
        return ResponseEntity.ok(response);
    }
}
