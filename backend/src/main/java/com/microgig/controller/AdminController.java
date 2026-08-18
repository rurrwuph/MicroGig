package com.microgig.controller;

import com.microgig.payload.response.MessageResponse;
import com.microgig.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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
}
