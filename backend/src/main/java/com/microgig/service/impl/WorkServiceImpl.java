package com.microgig.service.impl;

import com.microgig.model.*;
import com.microgig.payload.request.WorkCreateRequest;
import com.microgig.payload.request.WorkUpdateRequest;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.WorkResponse;
import com.microgig.repository.NotificationRepository;
import com.microgig.repository.UserRepository;
import com.microgig.repository.WorkAssignmentRepository;
import com.microgig.repository.WorkRequestRepository;
import com.microgig.service.WorkService;
import com.microgig.service.mapper.EntityDtoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkServiceImpl implements WorkService {

    private final WorkRequestRepository workRequestRepository;
    private final UserRepository userRepository;
    private final WorkAssignmentRepository workAssignmentRepository;
    private final NotificationRepository notificationRepository;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "availableWork", key = "'all_open'")
    public List<WorkResponse> getAllWork() {
        return workRequestRepository.findAll().stream()
                .map(EntityDtoMapper::toWorkResponse)
                .collect(Collectors.toList());
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

        WorkRequest workRequest = WorkRequest.builder()
                .client(client)
                .title(request.getTitle().trim())
                .description(request.getDescription().trim())
                .amount(request.getAmount())
                .deadline(request.getDeadline())
                .category(request.getCategory() != null ? request.getCategory().trim() : "General")
                .skills(request.getSkills() != null ? request.getSkills().trim() : "")
                .status(WorkStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build();

        workRequest = workRequestRepository.save(workRequest);
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
                        .message("The client has modified the details/scope for '" + existing.getTitle()
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
    @CacheEvict(value = "availableWork", allEntries = true)
    public MessageResponse cancelWork(Long clientId, Long workId) {
        WorkRequest existing = workRequestRepository.findById(workId)
                .orElseThrow(() -> new IllegalArgumentException("Job post not found with id: " + workId));

        if (!existing.getClient().getId().equals(clientId)) {
            throw new IllegalStateException("You can only cancel your own job posts.");
        }

        if (existing.getStatus() != WorkStatus.OPEN) {
            throw new IllegalArgumentException("Only OPEN posts can be cancelled. Current status is " + existing.getStatus() + ".");
        }

        existing.setStatus(WorkStatus.CANCELLED);
        existing.setCancelledAt(LocalDateTime.now());
        workRequestRepository.save(existing);

        return MessageResponse.builder()
                .message("Job post cancelled successfully.")
                .build();
    }
}
