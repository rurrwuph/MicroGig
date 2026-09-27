package com.microgig.service;

import com.microgig.model.*;
import com.microgig.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SchedulerService {

    private static final Logger log = LoggerFactory.getLogger(SchedulerService.class);

    private final WorkAssignmentRepository assignmentRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final WorkRequestRepository workRequestRepository;
    private final NotificationRepository notificationRepository;
    private final org.springframework.cache.CacheManager cacheManager;

    @Scheduled(fixedRate = 60000) // Run every minute
    @Transactional
    public void checkDeadlinesAndReviews() {
        try {
            LocalDateTime now = LocalDateTime.now();

            // 1. Check for expired assignments across active states
            List<AssignmentStatus> activeStatuses = List.of(
                    AssignmentStatus.ACCEPTED,
                    AssignmentStatus.IN_PROGRESS,
                    AssignmentStatus.REVISION_REQUESTED
            );

            for (AssignmentStatus status : activeStatuses) {
                List<WorkAssignment> activeAssignments = assignmentRepository.findByStatus(status);
                for (WorkAssignment assignment : activeAssignments) {
                    if (assignment.getWorkRequest() != null && assignment.getWorkRequest().getDeadline() != null) {
                        if (now.isAfter(assignment.getWorkRequest().getDeadline())) {
                            assignment.setStatus(AssignmentStatus.EXPIRED);
                            applyPenalty(assignment);
                            assignmentRepository.save(assignment);
                        }
                    }
                }
            }

            // 2. Check for missing reviews (> 3 days after submission)
            List<WorkAssignment> doneAssignments = assignmentRepository.findByStatus(AssignmentStatus.DONE);
            for (WorkAssignment assignment : doneAssignments) {
                if (assignment.getSubmittedAt() != null && now.isAfter(assignment.getSubmittedAt().plusDays(3))) {
                    if (assignment.getWorkRequest() != null && assignment.getWorkRequest().getClient() != null) {
                        User client = assignment.getWorkRequest().getClient();
                        if (!client.isLocked()) {
                            client.setLocked(true);
                            userRepository.save(client);
                        }
                    }
                }
            }

            // 3. Auto-remove OPEN work requests whose due date / deadline has passed
            List<WorkRequest> openWorkRequests = workRequestRepository.findByStatusOrderByCreatedAtDesc(WorkStatus.OPEN);
            boolean evictedCache = false;
            for (WorkRequest wr : openWorkRequests) {
                if (wr.getDeadline() != null && now.isAfter(wr.getDeadline())) {
                    wr.setStatus(WorkStatus.CANCELLED);
                    wr.setIsDeleted(true);
                    wr.setDeletedAt(now);
                    wr.setCancelledAt(now);
                    workRequestRepository.save(wr);

                    Notification notification = Notification.builder()
                            .user(wr.getClient())
                            .type("JOB_EXPIRED")
                            .title("Job Posting Expired: " + wr.getTitle())
                            .message("Your job post '" + wr.getTitle() + "' was automatically removed because the deadline passed without an assigned freelancer.")
                            .referenceId(wr.getId())
                            .isRead(false)
                            .createdAt(now)
                            .build();
                    notificationRepository.save(notification);
                    evictedCache = true;
                    log.info("Auto-removed expired work request ID: {} - '{}'", wr.getId(), wr.getTitle());
                }
            }

            if (evictedCache && cacheManager != null) {
                try {
                    var cache = cacheManager.getCache("availableWork");
                    if (cache != null) {
                        cache.clear();
                    }
                } catch (Exception ex) {
                    log.warn("Failed to clear availableWork cache after expiring jobs: {}", ex.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Error during scheduled deadline/review inspection: {}", e.getMessage(), e);
        }
    }

    private void applyPenalty(WorkAssignment assignment) {
        if (assignment == null || assignment.getWorkRequest() == null || assignment.getFreelancer() == null) {
            return;
        }

        if (!transactionRepository.existsByWorkAssignmentIdAndType(assignment.getId(), "PENALTY")) {
            BigDecimal requestAmount = assignment.getWorkRequest().getAmount() != null
                    ? assignment.getWorkRequest().getAmount() : BigDecimal.ZERO;
            BigDecimal penaltyAmount = requestAmount.multiply(new BigDecimal("0.10"));

            User freelancer = assignment.getFreelancer();

            Transaction penalty = Transaction.builder()
                    .user(freelancer)
                    .workAssignment(assignment)
                    .amount(penaltyAmount.negate())
                    .type("PENALTY")
                    .description("Late delivery penalty (-10%) for: \"" + assignment.getWorkRequest().getTitle() + "\"")
                    .createdAt(LocalDateTime.now())
                    .build();

            BigDecimal currentBal = freelancer.getBalance() != null ? freelancer.getBalance() : BigDecimal.ZERO;
            freelancer.setBalance(currentBal.subtract(penaltyAmount));

            transactionRepository.save(penalty);
            userRepository.save(freelancer);
        }
    }
}
