package com.microgig.service.impl;

import com.microgig.model.*;
import com.microgig.payload.request.ModerationDecisionRequest;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.WorkResponse;
import com.microgig.repository.*;
import com.microgig.service.AdminService;
import com.microgig.service.mapper.EntityDtoMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final WorkRequestRepository workRequestRepository;
    private final WorkAssignmentRepository workAssignmentRepository;
    private final NotificationRepository notificationRepository;
    private final TransactionRepository transactionRepository;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getSystemStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalClients", userRepository.countUsersByRoleNative("ROLE_CLIENT"));
        stats.put("totalFreelancers", userRepository.countUsersByRoleNative("ROLE_FREELANCER"));
        stats.put("totalJobs", workRequestRepository.count());
        stats.put("totalAssignments", workAssignmentRepository.count());
        stats.put("flaggedJobs", workRequestRepository.countByStatus(WorkStatus.FLAGGED));
        return stats;
    }

    @Override
    @Transactional
    public MessageResponse toggleUserLock(Long userId, boolean locked) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        user.setLocked(locked);
        userRepository.save(user);

        return MessageResponse.builder()
                .message("User " + user.getUsername() + " locked status set to: " + locked)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkResponse> getFlaggedWorkRequests() {
        return workRequestRepository.findFlaggedWorkRequests().stream()
                .map(EntityDtoMapper::toWorkResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = "availableWork", allEntries = true)
    public WorkResponse moderateWorkRequest(Long adminId, Long workRequestId, ModerationDecisionRequest request) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found with id: " + adminId));

        if (admin.getRole() != Role.ROLE_ADMIN) {
            throw new IllegalStateException("Only administrators can perform post moderation decisions.");
        }

        WorkRequest workRequest = workRequestRepository.findById(workRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Work request not found with id: " + workRequestId));

        String action = request.getAction() != null ? request.getAction().trim().toUpperCase() : "";
        String adminNotes = request.getAdminNotes() != null ? request.getAdminNotes().trim() : "";

        WorkStatus previousStatus = workRequest.getStatus();

        switch (action) {
            case "APPROVE" -> {
                workRequest.setStatus(WorkStatus.OPEN);
                workRequest.setModerationReason(null);
                workRequest.setFlaggedAt(null);
                workRequest.setAppealRequested(false);
                workRequest.setAppealNotes(null);
                workRequest.setAppealRequestedAt(null);

                Notification notif = Notification.builder()
                        .user(workRequest.getClient())
                        .type("POST_APPROVED")
                        .title("Job Approved by Administrator: " + workRequest.getTitle())
                        .message("Your job post has been reviewed and approved by an administrator. It is now publicly active.")
                        .referenceId(workRequest.getId())
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                notificationRepository.save(notif);
            }

            case "REQUEST_CHANGES" -> {
                workRequest.setStatus(WorkStatus.FLAGGED);
                workRequest.setModerationReason(!adminNotes.isEmpty() ? adminNotes : "Administrator requested modifications.");
                workRequest.setAppealRequested(false);

                Notification notif = Notification.builder()
                        .user(workRequest.getClient())
                        .type("POST_CHANGES_REQUESTED")
                        .title("Changes Requested: " + workRequest.getTitle())
                        .message("An administrator reviewed your post and requested modifications: " + workRequest.getModerationReason())
                        .referenceId(workRequest.getId())
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                notificationRepository.save(notif);
            }

            case "REJECT_APPEAL" -> {
                // Edge Case 2: Outright Rejection from APPEAL_PENDING / FLAGGED to SUSPENDED
                workRequest.setStatus(WorkStatus.SUSPENDED);
                workRequest.setModerationReason("Appeal Rejected by Admin: " + (!adminNotes.isEmpty() ? adminNotes : "Policy violation upheld."));
                workRequest.setAppealRequested(false);

                Notification notif = Notification.builder()
                        .user(workRequest.getClient())
                        .type("POST_SUSPENDED")
                        .title("Appeal Rejected - Post Suspended: " + workRequest.getTitle())
                        .message("Your appeal was rejected by an administrator. Reason: " + workRequest.getModerationReason())
                        .referenceId(workRequest.getId())
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                notificationRepository.save(notif);

                handleEscrowLockIfAssigned(workRequest, previousStatus, adminNotes);
            }

            case "SUSPEND" -> {
                // Edge Case 1: Direct Suspension from OPEN, ASSIGNED, or FLAGGED
                workRequest.setStatus(WorkStatus.SUSPENDED);
                workRequest.setModerationReason("Suspended by Administrator: " + (!adminNotes.isEmpty() ? adminNotes : "Severe policy violation."));
                workRequest.setAppealRequested(false);

                Notification notif = Notification.builder()
                        .user(workRequest.getClient())
                        .type("POST_SUSPENDED")
                        .title("Job Post Suspended: " + workRequest.getTitle())
                        .message("Your job post has been suspended by an administrator. Reason: " + workRequest.getModerationReason())
                        .referenceId(workRequest.getId())
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                notificationRepository.save(notif);

                handleEscrowLockIfAssigned(workRequest, previousStatus, adminNotes);
            }

            case "SOFT_DELETE" -> {
                workRequest.setIsDeleted(true);
                workRequest.setDeletedAt(LocalDateTime.now());
                handleEscrowLockIfAssigned(workRequest, previousStatus, adminNotes);
            }

            default -> throw new IllegalArgumentException("Invalid moderation action: '" + action
                    + "'. Valid actions: APPROVE, REQUEST_CHANGES, REJECT_APPEAL, SUSPEND, SOFT_DELETE");
        }

        workRequest = workRequestRepository.save(workRequest);
        return EntityDtoMapper.toWorkResponse(workRequest);
    }

    private void handleEscrowLockIfAssigned(WorkRequest workRequest, WorkStatus previousStatus, String adminNotes) {
        if (previousStatus == WorkStatus.ASSIGNED) {
            Optional<WorkAssignment> assignmentOpt = workAssignmentRepository.findByWorkRequestId(workRequest.getId());
            if (assignmentOpt.isPresent()) {
                WorkAssignment assignment = assignmentOpt.get();
                if (assignment.getStatus() == AssignmentStatus.IN_PROGRESS
                        || assignment.getStatus() == AssignmentStatus.ACCEPTED
                        || assignment.getStatus() == AssignmentStatus.REVISION_REQUESTED) {

                    // Record HELD_IN_DISPUTE Transaction Ledger Entry
                    Transaction disputeTx = Transaction.builder()
                            .user(workRequest.getClient())
                            .workAssignment(assignment)
                            .amount(workRequest.getAmount())
                            .type("HELD_IN_DISPUTE")
                            .description("Escrow funds ($" + workRequest.getAmount()
                                    + ") frozen in dispute due to administrative suspension/action on job #"
                                    + workRequest.getId() + ". Notes: " + adminNotes)
                            .createdAt(LocalDateTime.now())
                            .build();
                    transactionRepository.save(disputeTx);

                    // Notify assigned freelancer
                    if (assignment.getFreelancer() != null) {
                        Notification freeNotif = Notification.builder()
                                .user(assignment.getFreelancer())
                                .type("ASSIGNMENT_DISPUTED")
                                .title("Assignment Suspended - Escrow Frozen: " + workRequest.getTitle())
                                .message("Job #" + workRequest.getId()
                                        + " has been suspended by administration. Project escrow is safely frozen under dispute.")
                                .referenceId(workRequest.getId())
                                .isRead(false)
                                .createdAt(LocalDateTime.now())
                                .build();
                        notificationRepository.save(freeNotif);
                    }
                }
            }
        }
    }
}
