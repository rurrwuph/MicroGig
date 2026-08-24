package com.microgig.controller;

import com.microgig.model.WorkStatus;
import com.microgig.payload.request.ManualFlagRequest;
import com.microgig.payload.request.ModerationDecisionRequest;
import com.microgig.payload.response.*;
import com.microgig.security.UserDetailsImpl;
import com.microgig.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        Map<String, Object> stats = adminService.getSystemStats();
        return ResponseEntity.ok(stats);
    }

    @PutMapping("/users/{userId}/lock")
    public ResponseEntity<MessageResponse> toggleUserLock(@PathVariable Long userId, @RequestParam boolean locked) {
        MessageResponse response = adminService.toggleUserLock(userId, locked);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/admin/users
     * Paginated drill-down for users management.
     */
    @GetMapping("/users")
    public ResponseEntity<Page<AdminUserResponse>> getUsersDrillDown(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean locked,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<AdminUserResponse> response = adminService.getUsersDrillDown(role, locked, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/admin/clients
     * Client analytics drill-down.
     */
    @GetMapping("/clients")
    public ResponseEntity<List<ClientAnalyticsResponse>> getClientsAnalytics() {
        List<ClientAnalyticsResponse> response = adminService.getClientsAnalytics();
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/admin/freelancers
     * Freelancer analytics drill-down.
     */
    @GetMapping("/freelancers")
    public ResponseEntity<List<FreelancerAnalyticsResponse>> getFreelancersAnalytics() {
        List<FreelancerAnalyticsResponse> response = adminService.getFreelancersAnalytics();
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/admin/work-requests
     * Work requests analytics drill-down with status filter.
     */
    @GetMapping("/work-requests")
    public ResponseEntity<Page<WorkResponse>> getWorkRequestsDrillDown(
            @RequestParam(required = false) WorkStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<WorkResponse> response = adminService.getWorkRequestsDrillDown(status, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/admin/work-requests/flagged
     * Retrieves all flagged job posts with pending appeals at the top.
     */
    @GetMapping("/work-requests/flagged")
    public ResponseEntity<List<WorkResponse>> getFlaggedWorkRequests() {
        List<WorkResponse> response = adminService.getFlaggedWorkRequests();
        return ResponseEntity.ok(response);
    }

    /**
     * PATCH /api/admin/work-requests/{id}/moderate
     * Admin performs moderation action (APPROVE, REQUEST_CHANGES, REJECT_APPEAL, SUSPEND, SOFT_DELETE).
     */
    @PatchMapping("/work-requests/{id}/moderate")
    public ResponseEntity<WorkResponse> moderateWorkRequest(@PathVariable Long id,
                                                            @Valid @RequestBody ModerationDecisionRequest request,
                                                            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkResponse response = adminService.moderateWorkRequest(userDetails.getId(), id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * PATCH /api/admin/work-requests/{id}/suspend
     * Admin directly suspends any job post from Marketplace or Dashboard.
     */
    @PatchMapping("/work-requests/{id}/suspend")
    public ResponseEntity<WorkResponse> suspendWorkRequest(@PathVariable Long id,
                                                           @RequestBody(required = false) Map<String, String> body,
                                                           @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String reason = body != null ? body.get("reason") : "Suspended by Administrator";
        WorkResponse response = adminService.suspendWorkRequest(userDetails.getId(), id, reason);
        return ResponseEntity.ok(response);
    }

    /**
     * PATCH /api/admin/work-requests/{id}/unsuspend
     * Admin restores a suspended job post back to the open marketplace.
     */
    @PatchMapping("/work-requests/{id}/unsuspend")
    public ResponseEntity<WorkResponse> unsuspendWorkRequest(@PathVariable Long id,
                                                             @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WorkResponse response = adminService.unsuspendWorkRequest(userDetails.getId(), id);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/admin/earnings
     * Admin retrieves comprehensive platform revenue metrics and commission transactions ledger.
     */
    @GetMapping("/earnings")
    public ResponseEntity<PlatformEarningsResponse> getPlatformEarnings() {
        PlatformEarningsResponse response = adminService.getPlatformEarnings();
        return ResponseEntity.ok(response);
    }
}
