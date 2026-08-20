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
