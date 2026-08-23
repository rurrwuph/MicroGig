package com.microgig.controller;

import com.microgig.payload.request.ModerationDecisionRequest;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.WorkResponse;
import com.microgig.security.UserDetailsImpl;
import com.microgig.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
}
