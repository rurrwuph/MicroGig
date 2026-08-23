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

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<com.microgig.payload.response.AdminUserResponse> getUsersDrillDown(String role, Boolean locked, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<User> usersPage;

        if (role != null && !role.isBlank()) {
            Role r = Role.valueOf(role.trim().toUpperCase().startsWith("ROLE_") ? role.trim().toUpperCase() : "ROLE_" + role.trim().toUpperCase());
            if (locked != null) {
                usersPage = userRepository.findByRoleAndIsLocked(r, locked, pageable);
            } else {
                usersPage = userRepository.findByRole(r, pageable);
            }
        } else if (locked != null) {
            usersPage = userRepository.findByIsLocked(locked, pageable);
        } else {
            usersPage = userRepository.findAll(pageable);
        }

        return usersPage.map(u -> {
            long postedJobs = workRequestRepository.findByClient(u).size();
            long completedAssignments = workAssignmentRepository.findByFreelancer(u).stream()
                    .filter(a -> a.getStatus() == AssignmentStatus.COMPLETED)
                    .count();

            return com.microgig.payload.response.AdminUserResponse.builder()
                    .id(u.getId())
                    .username(u.getUsername())
                    .email(u.getEmail())
                    .fullName(u.getFullName() != null ? u.getFullName() : "")
                    .role(u.getRole() != null ? u.getRole().name() : "")
                    .balance(u.getBalance() != null ? u.getBalance() : java.math.BigDecimal.ZERO)
                    .locked(u.isLocked())
                    .createdAt(u.getCreatedAt())
                    .postedJobsCount(postedJobs)
                    .completedAssignmentsCount(completedAssignments)
                    .build();
        });
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.microgig.payload.response.ClientAnalyticsResponse> getClientsAnalytics() {
        List<User> clients = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ROLE_CLIENT)
                .collect(Collectors.toList());

        return clients.stream().map(c -> {
            List<WorkRequest> requests = workRequestRepository.findByClient(c);
            long totalPosted = requests.size();
            long activeGigs = requests.stream().filter(r -> r.getStatus() == WorkStatus.ASSIGNED || r.getStatus() == WorkStatus.OPEN).count();
            long completedGigs = requests.stream().filter(r -> r.getStatus() == WorkStatus.COMPLETED).count();

            java.math.BigDecimal totalSpent = requests.stream()
                    .filter(r -> r.getStatus() == WorkStatus.COMPLETED)
                    .map(WorkRequest::getAmount)
                    .filter(java.util.Objects::nonNull)
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

            return com.microgig.payload.response.ClientAnalyticsResponse.builder()
                    .id(c.getId())
                    .username(c.getUsername())
                    .email(c.getEmail())
                    .fullName(c.getFullName() != null ? c.getFullName() : "")
                    .balance(c.getBalance() != null ? c.getBalance() : java.math.BigDecimal.ZERO)
                    .locked(c.isLocked())
                    .totalPostedJobs(totalPosted)
                    .activeGigsCount(activeGigs)
                    .completedGigsCount(completedGigs)
                    .totalSpent(totalSpent)
                    .createdAt(c.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.microgig.payload.response.FreelancerAnalyticsResponse> getFreelancersAnalytics() {
        List<User> freelancers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ROLE_FREELANCER)
                .collect(Collectors.toList());

        return freelancers.stream().map(f -> {
            List<WorkAssignment> assignments = workAssignmentRepository.findByFreelancer(f);
            long completed = assignments.stream().filter(a -> a.getStatus() == AssignmentStatus.COMPLETED).count();
            long active = assignments.stream().filter(a -> a.getStatus() == AssignmentStatus.ACCEPTED || a.getStatus() == AssignmentStatus.IN_PROGRESS || a.getStatus() == AssignmentStatus.REVISION_REQUESTED).count();

            List<WorkAssignment> rated = assignments.stream()
                    .filter(a -> a.getStatus() == AssignmentStatus.COMPLETED && a.getRating() != null)
                    .collect(Collectors.toList());

            Double avgRating = rated.isEmpty() ? null : rated.stream().mapToInt(WorkAssignment::getRating).average().orElse(0.0);

            return com.microgig.payload.response.FreelancerAnalyticsResponse.builder()
                    .id(f.getId())
                    .username(f.getUsername())
                    .email(f.getEmail())
                    .fullName(f.getFullName() != null ? f.getFullName() : "")
                    .balance(f.getBalance() != null ? f.getBalance() : java.math.BigDecimal.ZERO)
                    .locked(f.isLocked())
                    .completedGigsCount(completed)
                    .activeGigsCount(active)
                    .averageRating(avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : null)
                    .totalReviews(rated.size())
                    .createdAt(f.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<WorkResponse> getWorkRequestsDrillDown(WorkStatus status, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<WorkRequest> page;
        if (status != null) {
            page = workRequestRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            page = workRequestRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return page.map(EntityDtoMapper::toWorkResponse);
    }

    @Override
    @Transactional
    @CacheEvict(value = "availableWork", allEntries = true)
    public WorkResponse flagWorkRequestManually(Long adminId, Long workRequestId, com.microgig.payload.request.ManualFlagRequest request) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found with id: " + adminId));

        if (admin.getRole() != Role.ROLE_ADMIN) {
            throw new IllegalStateException("Only administrators can manually flag work requests.");
        }

        WorkRequest workRequest = workRequestRepository.findById(workRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Work request not found with id: " + workRequestId));

        LocalDateTime now = LocalDateTime.now();
        workRequest.setStatus(WorkStatus.FLAGGED);
        workRequest.setFlaggedAt(now);
        workRequest.setModerationReason("Admin Manual Flag: " + request.getModerationReason().trim());
        workRequest.setAppealRequested(false);
        workRequest.setAppealNotes(null);
        workRequest.setAppealRequestedAt(null);

        workRequest = workRequestRepository.save(workRequest);

        // Notify client
        Notification notif = Notification.builder()
                .user(workRequest.getClient())
                .type("POST_FLAGGED_BY_ADMIN")
                .title("Job Flagged by Administrator: " + workRequest.getTitle())
                .message("Your job post has been flagged for administrative review. Reason: " + request.getModerationReason().trim())
                .referenceId(workRequest.getId())
                .isRead(false)
                .createdAt(now)
                .build();
        notificationRepository.save(notif);

        return EntityDtoMapper.toWorkResponse(workRequest);
    }
}

