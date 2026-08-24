package com.microgig.service.impl;

import com.microgig.model.*;
import com.microgig.payload.request.AppealRequest;
import com.microgig.payload.request.WorkCreateRequest;
import com.microgig.payload.request.WorkUpdateRequest;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.WorkResponse;
import com.microgig.repository.NotificationRepository;
import com.microgig.repository.UserRepository;
import com.microgig.repository.WorkAssignmentRepository;
import com.microgig.repository.WorkRequestRepository;
import com.microgig.service.ContentModerationService;
import com.microgig.service.ModerationResult;
import com.microgig.service.WorkService;
import com.microgig.service.mapper.EntityDtoMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkServiceImpl implements WorkService {

    private final WorkRequestRepository workRequestRepository;
    private final UserRepository userRepository;
    private final WorkAssignmentRepository workAssignmentRepository;
    private final NotificationRepository notificationRepository;
    private final ContentModerationService contentModerationService;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "availableWork", key = "'all_public'")
    public List<WorkResponse> getAllWork() {
        return workRequestRepository.findPublicMarketplaceWork().stream()
                .map(EntityDtoMapper::toWorkResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public WorkResponse getWorkById(Long workId) {
        WorkRequest workRequest = workRequestRepository.findById(workId)
                .orElseThrow(() -> new IllegalArgumentException("Job post not found with id: " + workId));
        return EntityDtoMapper.toWorkResponse(workRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkResponse> getMyPostedJobs(Long clientId) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found with id: " + clientId));
        return workRequestRepository.findByClientOrderByCreatedAtDesc(client).stream()
                .map(EntityDtoMapper::toWorkResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = "availableWork", allEntries = true)
    public WorkResponse createWork(Long clientId, WorkCreateRequest request) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found with id: " + clientId));

        if (client.isLocked()) {
            throw new IllegalArgumentException("Client account is locked.");
        }

        if (client.getBalance().compareTo(request.getAmount()) < 0) {
            throw new IllegalArgumentException("Insufficient balance. Your wallet has $" + client.getBalance()
                    + " but this job costs $" + request.getAmount()
                    + ". Please top up your wallet first.");
        }

        String title = request.getTitle().trim();
        String description = request.getDescription().trim();
        String category = request.getCategory() != null ? request.getCategory().trim() : "General";
        String skills = request.getSkills() != null ? request.getSkills().trim() : "";

        // Automated Pre-Publication Policy Check via PostgreSQL Native SQL Regex
        ModerationResult modResult = contentModerationService.evaluate(title, description, skills);

        WorkStatus initialStatus = modResult.isFlagged() ? WorkStatus.FLAGGED : WorkStatus.OPEN;

        WorkRequest workRequest = WorkRequest.builder()
                .client(client)
                .title(title)
                .description(description)
                .amount(request.getAmount())
                .deadline(request.getDeadline())
                .category(category)
                .skills(skills)
                .status(initialStatus)
                .moderationReason(modResult.isFlagged() ? modResult.getReason() : null)
                .flaggedAt(modResult.isFlagged() ? LocalDateTime.now() : null)
                .appealRequested(false)
                .isDeleted(false)
                .createdAt(LocalDateTime.now())
                .build();

        workRequest = workRequestRepository.save(workRequest);

        if (modResult.isFlagged()) {
            Notification notification = Notification.builder()
                    .user(client)
                    .type("POST_FLAGGED")
                    .title("Job Post Flagged for Moderation: " + workRequest.getTitle())
                    .message("Your job post was automatically flagged for review due to policy checks: "
                            + modResult.getReason() + ". Please revise the post or submit an appeal for admin review.")
                    .referenceId(workRequest.getId())
                    .isRead(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notification);
        }

        return EntityDtoMapper.toWorkResponse(workRequest);
    }

    @Override
    @Transactional
    @CacheEvict(value = "availableWork", allEntries = true)
    public WorkResponse updateWork(Long clientId, Long workId, WorkUpdateRequest request) {
        WorkRequest existing = workRequestRepository.findById(workId)
                .orElseThrow(() -> new IllegalArgumentException("Job post not found with id: " + workId));

        if (!existing.getClient().getId().equals(clientId)) {
            throw new IllegalStateException("You can only modify your own job posts.");
        }

        if (existing.getStatus() == WorkStatus.COMPLETED) {
            throw new IllegalArgumentException("Cannot modify a completed job.");
        }
        if (existing.getStatus() == WorkStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot modify a cancelled job.");
        }
        if (existing.getStatus() == WorkStatus.SUSPENDED) {
            throw new IllegalArgumentException("Cannot modify a suspended job.");
        }

        User client = existing.getClient();

        // If budget increases, check wallet balance
        if (request.getAmount() != null && request.getAmount().compareTo(existing.getAmount()) > 0) {
            if (client.getBalance().compareTo(request.getAmount()) < 0) {
                throw new IllegalArgumentException("Insufficient balance to increase budget to $" + request.getAmount()
                        + ". Current wallet balance: $" + client.getBalance());
            }
        }

        if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
            existing.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null && !request.getDescription().trim().isEmpty()) {
            existing.setDescription(request.getDescription().trim());
        }
        if (request.getCategory() != null) {
            existing.setCategory(request.getCategory().trim());
        }
        if (request.getSkills() != null) {
            existing.setSkills(request.getSkills().trim());
        }
        if (request.getAmount() != null && request.getAmount().signum() > 0) {
            existing.setAmount(request.getAmount());
        }
        if (request.getDeadline() != null) {
            existing.setDeadline(request.getDeadline());
        }

        existing.setLastModifiedAt(LocalDateTime.now());

        // Re-evaluate content policy via Native SQL regex
        ModerationResult modResult = contentModerationService.evaluate(
                existing.getTitle(), existing.getDescription(), existing.getSkills()
        );

        if (existing.getStatus() == WorkStatus.FLAGGED) {
            if (!modResult.isFlagged()) {
                // Post is cleaned by client! Publish it
                existing.setStatus(WorkStatus.OPEN);
                existing.setModerationReason(null);
                existing.setFlaggedAt(null);
                existing.setAppealRequested(false);
                existing.setAppealNotes(null);

                Notification notification = Notification.builder()
                        .user(client)
                        .type("POST_APPROVED")
                        .title("Job Post Published: " + existing.getTitle())
                        .message("Your updated job post has passed all policy checks and is now publicly live.")
                        .referenceId(existing.getId())
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                notificationRepository.save(notification);
            } else {
                // Still contains violations
                existing.setModerationReason(modResult.getReason());
                existing.setFlaggedAt(LocalDateTime.now());
                existing.setAppealRequested(false);
            }
        } else if (existing.getStatus() == WorkStatus.OPEN && modResult.isFlagged()) {
            // Edit introduced prohibited terms
            existing.setStatus(WorkStatus.FLAGGED);
            existing.setModerationReason(modResult.getReason());
            existing.setFlaggedAt(LocalDateTime.now());
            existing.setAppealRequested(false);

            Notification notification = Notification.builder()
                    .user(client)
                    .type("POST_FLAGGED")
                    .title("Job Post Flagged: " + existing.getTitle())
                    .message("Your job edit was flagged for policy violations: " + modResult.getReason() + ". Please revise or appeal.")
                    .referenceId(existing.getId())
                    .isRead(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notification);
        }

        existing = workRequestRepository.save(existing);

        // If this work was already ASSIGNED, notify the assigned freelancer
        if (existing.getStatus() == WorkStatus.ASSIGNED) {
            Optional<WorkAssignment> assignmentOpt = workAssignmentRepository.findByWorkRequestId(existing.getId());
            if (assignmentOpt.isPresent() && assignmentOpt.get().getFreelancer() != null) {
                User freelancer = assignmentOpt.get().getFreelancer();

                Notification notification = Notification.builder()
                        .user(freelancer)
                        .type("POST_MODIFIED")
                        .title("Job Modified by Client: " + existing.getTitle())
                        .message("The client has modified details for '" + existing.getTitle()
                                + "'. If you do not accept these changes, you may cancel this assignment with compensation within 5 minutes.")
                        .referenceId(existing.getId())
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build();

                notificationRepository.save(notification);
            }
        }

        return EntityDtoMapper.toWorkResponse(existing);
    }

    @Override
    @Transactional
    public WorkResponse appealWork(Long clientId, Long workId, AppealRequest request) {
        WorkRequest existing = workRequestRepository.findById(workId)
                .orElseThrow(() -> new IllegalArgumentException("Job post not found with id: " + workId));

        if (!existing.getClient().getId().equals(clientId)) {
            throw new IllegalStateException("You can only submit appeals for your own job posts.");
        }

        if (existing.getStatus() != WorkStatus.FLAGGED) {
            throw new IllegalArgumentException("Only FLAGGED job posts can be appealed. Current status is " + existing.getStatus());
        }

        String notes = (request != null && request.getAppealNotes() != null && !request.getAppealNotes().isBlank())
                ? request.getAppealNotes().trim()
                : "Client requested moderation appeal review.";

        existing.setAppealRequested(true);
        existing.setAppealNotes(notes);
        existing.setAppealRequestedAt(LocalDateTime.now());
        existing = workRequestRepository.save(existing);

        // Notify client
        Notification clientNotif = Notification.builder()
                .user(existing.getClient())
                .type("APPEAL_PENDING")
                .title("Appeal Submitted: " + existing.getTitle())
                .message("Your appeal for '" + existing.getTitle() + "' has been queued for administrator review.")
                .referenceId(existing.getId())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(clientNotif);

        // Notify platform admins
        List<User> admins = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ROLE_ADMIN)
                .collect(Collectors.toList());

        for (User admin : admins) {
            Notification adminNotif = Notification.builder()
                    .user(admin)
                    .type("APPEAL_SUBMITTED")
                    .title("Moderation Appeal: " + existing.getTitle())
                    .message("Client @" + existing.getClient().getUsername() + " submitted an appeal for flagged job #"
                            + existing.getId() + ". Appeal notes: " + notes)
                    .referenceId(existing.getId())
                    .isRead(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(adminNotif);
        }

        return EntityDtoMapper.toWorkResponse(existing);
    }

    @Override
    @Transactional
    @CacheEvict(value = "availableWork", allEntries = true)
    public MessageResponse cancelWork(Long clientId, Long workId) {
        WorkRequest existing = workRequestRepository.findById(workId)
                .orElseThrow(() -> new IllegalArgumentException("Job post not found with id: " + workId));

        if (!existing.getClient().getId().equals(clientId)) {
            throw new IllegalStateException("You can only cancel your own job posts.");
        }

        if (existing.getStatus() != WorkStatus.OPEN && existing.getStatus() != WorkStatus.FLAGGED) {
            throw new IllegalArgumentException("Only OPEN or FLAGGED posts can be cancelled. Current status is " + existing.getStatus() + ".");
        }

        existing.setStatus(WorkStatus.CANCELLED);
        existing.setCancelledAt(LocalDateTime.now());
        workRequestRepository.save(existing);

        return MessageResponse.builder()
                .message("Job post cancelled successfully.")
                .build();
    }
}
