package com.microgig.service.impl;

import com.microgig.model.Notification;
import com.microgig.model.User;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.NotificationResponse;
import com.microgig.payload.response.UnreadCountResponse;
import com.microgig.repository.NotificationRepository;
import com.microgig.repository.UserRepository;
import com.microgig.service.NotificationService;
import com.microgig.service.mapper.EntityDtoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        return notificationRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(EntityDtoMapper::toNotificationResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        long count = notificationRepository.countByUserAndIsReadFalse(user);
        return UnreadCountResponse.builder()
                .unreadCount(count)
                .build();
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with id: " + notificationId));

        if (!notification.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Unauthorized to modify this notification.");
        }

        notification.setRead(true);
        notification = notificationRepository.save(notification);
        return EntityDtoMapper.toNotificationResponse(notification);
    }

    @Override
    @Transactional
    public MessageResponse markAllAsRead(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        List<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user);
        for (Notification n : notifications) {
            if (!n.isRead()) {
                n.setRead(true);
            }
        }
        notificationRepository.saveAll(notifications);
        return MessageResponse.builder()
                .message("All notifications marked as read")
                .build();
    }

    @Override
    @Transactional
    public NotificationResponse createNotification(User user, String type, String title, String message, Long referenceId) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .referenceId(referenceId)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notification = notificationRepository.save(notification);
        return EntityDtoMapper.toNotificationResponse(notification);
    }
}
