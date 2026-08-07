package com.microgig.service;

import com.microgig.model.User;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.NotificationResponse;
import com.microgig.payload.response.UnreadCountResponse;

import java.util.List;

public interface NotificationService {

    List<NotificationResponse> getUserNotifications(Long userId);

    UnreadCountResponse getUnreadCount(Long userId);

    NotificationResponse markAsRead(Long userId, Long notificationId);

    MessageResponse markAllAsRead(Long userId);

    NotificationResponse createNotification(User user, String type, String title, String message, Long referenceId);
}
