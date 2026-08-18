package com.microgig.controller;

import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.NotificationResponse;
import com.microgig.payload.response.UnreadCountResponse;
import com.microgig.security.UserDetailsImpl;
import com.microgig.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * GET /api/notifications
     * Returns all notifications for authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<NotificationResponse> response = notificationService.getUserNotifications(userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/notifications/unread-count
     * Returns the count of unread notifications.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        UnreadCountResponse response = notificationService.getUnreadCount(userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * PUT /api/notifications/{id}/read
     * Marks a specific notification as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(@PathVariable Long id,
                                                           @AuthenticationPrincipal UserDetailsImpl userDetails) {
        NotificationResponse response = notificationService.markAsRead(userDetails.getId(), id);
        return ResponseEntity.ok(response);
    }

    /**
     * PUT /api/notifications/read-all
     * Marks all unread notifications for the user as read.
     */
    @PutMapping("/read-all")
    public ResponseEntity<MessageResponse> markAllAsRead(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        MessageResponse response = notificationService.markAllAsRead(userDetails.getId());
        return ResponseEntity.ok(response);
    }
}
