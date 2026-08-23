package com.microgig.service.impl;

import com.microgig.model.*;
import com.microgig.payload.request.CancelAssignmentRequest;
import com.microgig.payload.request.PayWorkRequest;
import com.microgig.payload.request.RevisionRequest;
import com.microgig.payload.request.SubmitWorkRequest;
import com.microgig.payload.response.CancelAssignmentResponse;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.WorkAssignmentResponse;
import com.microgig.repository.*;
import com.microgig.service.AssignmentService;
import com.microgig.service.mapper.EntityDtoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssignmentServiceImpl implements AssignmentService {

    private final WorkAssignmentRepository assignmentRepository;
    private final WorkRequestRepository requestRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final com.microgig.service.LeaderboardService leaderboardService;

    @Value("${microgig.cancellation-grace-minutes:5}")
    private int cancellationGraceMinutes;

    @Value("${microgig.admin-commission-rate:0.001}")
    private BigDecimal adminCommissionRate;

    @Override
    @Transactional(readOnly = true)
    public List<WorkAssignmentResponse> getMyAssignments(Long freelancerId) {
        User freelancer = userRepository.findById(freelancerId)
                .orElseThrow(() -> new IllegalArgumentException("Freelancer not found with id: " + freelancerId));
        return assignmentRepository.findByFreelancerOrderByIdDesc(freelancer).stream()
                .map(EntityDtoMapper::toWorkAssignmentResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkAssignmentResponse> getClientAssignments(Long clientId) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found with id: " + clientId));
        return assignmentRepository.findByClient(client).stream()
                .map(EntityDtoMapper::toWorkAssignmentResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = "availableWork", allEntries = true)
    public WorkAssignmentResponse acceptWork(Long freelancerId, Long workRequestId) {
        WorkRequest request = requestRepository.findById(workRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Work request not found: " + workRequestId));

        if (request.getStatus() != WorkStatus.OPEN) {
            throw new IllegalArgumentException("Work is not open.");
        }

        User freelancer = userRepository.findById(freelancerId)
                .orElseThrow(() -> new IllegalArgumentException("Freelancer not found: " + freelancerId));

        WorkAssignment assignment = assignmentRepository.findByWorkRequestId(workRequestId)
                .orElse(new WorkAssignment());

        assignment.setWorkRequest(request);
        assignment.setFreelancer(freelancer);
        assignment.setStatus(AssignmentStatus.ACCEPTED);
        assignment.setAcceptedAt(LocalDateTime.now());
        assignment.setCancellationReason(null);

        request.setStatus(WorkStatus.ASSIGNED);
        requestRepository.save(request);
        assignment = assignmentRepository.save(assignment);

        // Notify client
        Notification notif = Notification.builder()
                .user(request.getClient())
                .type("WORK_ACCEPTED")
                .title("Gig Accepted: " + request.getTitle())
                .message("@" + freelancer.getUsername() + " has accepted your job post '" + request.getTitle() + "'.")
                .referenceId(request.getId())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notif);

        return EntityDtoMapper.toWorkAssignmentResponse(assignment);
    }

    @Override
    @Transactional
    public WorkAssignmentResponse submitWork(Long freelancerId, Long workRequestId, SubmitWorkRequest submitRequest) {
        WorkAssignment assignment = assignmentRepository.findByWorkRequestId(workRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found for this work request."));

        if (!assignment.getFreelancer().getId().equals(freelancerId)) {
            throw new IllegalStateException("You can only submit work for your own assignments.");
        }

        if (assignment.getStatus() == AssignmentStatus.EXPIRED
                || assignment.getStatus() == AssignmentStatus.CANNOT_DO
                || assignment.getStatus() == AssignmentStatus.CANCELLED_BY_FREELANCER
                || assignment.getStatus() == AssignmentStatus.COMPLETED) {
            throw new IllegalArgumentException("Cannot submit work for this assignment status: " + assignment.getStatus());
        }

        if (submitRequest != null) {
            if (submitRequest.getSubmissionNotes() != null) {
                assignment.setSubmissionNotes(submitRequest.getSubmissionNotes().trim());
            }
            if (submitRequest.getSubmissionUrl() != null) {
                assignment.setSubmissionUrl(submitRequest.getSubmissionUrl().trim());
            }
        }

        assignment.setStatus(AssignmentStatus.DONE);
        assignment.setSubmittedAt(LocalDateTime.now());
        assignment = assignmentRepository.save(assignment);

        // Notify client
        WorkRequest req = assignment.getWorkRequest();
        Notification notif = Notification.builder()
                .user(req.getClient())
                .type("WORK_SUBMITTED")
                .title("Work Submitted: " + req.getTitle())
                .message("@" + assignment.getFreelancer().getUsername() + " submitted deliverables for '" + req.getTitle() + "'. Please review and release payment.")
                .referenceId(req.getId())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notif);

        return EntityDtoMapper.toWorkAssignmentResponse(assignment);
    }

    @Override
    @Transactional
    @CacheEvict(value = "availableWork", allEntries = true)
    public CancelAssignmentResponse cancelAssignment(Long freelancerId, Long workRequestId, CancelAssignmentRequest cancelRequest) {
        WorkAssignment assignment = assignmentRepository.findByWorkRequestId(workRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found."));

        if (!assignment.getFreelancer().getId().equals(freelancerId)) {
            throw new IllegalStateException("You can only cancel your own assignment.");
        }

        if (assignment.getStatus() == AssignmentStatus.COMPLETED) {
            throw new IllegalArgumentException("Cannot cancel a completed assignment.");
        }
        if (assignment.getStatus() == AssignmentStatus.CANCELLED_BY_FREELANCER) {
            throw new IllegalArgumentException("Assignment is already cancelled.");
        }

        String reason = cancelRequest.getReason().trim();

        WorkRequest request = assignment.getWorkRequest();
        User client = userRepository.findById(request.getClient().getId())
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        User freelancer = userRepository.findById(assignment.getFreelancer().getId())
                .orElseThrow(() -> new IllegalArgumentException("Freelancer not found"));

        // ── 5-Minute Post Modification Compensation Check ──
        boolean isEligibleForCompensation = false;
        BigDecimal compensationAmount = BigDecimal.ZERO;

        LocalDateTime lastModified = request.getLastModifiedAt();
        if (lastModified != null && lastModified.isAfter(LocalDateTime.now().minusMinutes(cancellationGraceMinutes))) {
            isEligibleForCompensation = true;
            compensationAmount = request.getAmount().multiply(new BigDecimal("0.001")).setScale(2, RoundingMode.HALF_UP);
            if (compensationAmount.compareTo(new BigDecimal("0.01")) < 0 && request.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                compensationAmount = new BigDecimal("0.01");
            }

            BigDecimal clientBal = client.getBalance() != null ? client.getBalance() : BigDecimal.ZERO;
            client.setBalance(clientBal.subtract(compensationAmount));

            Transaction clientTx = Transaction.builder()
                    .user(client)
                    .workAssignment(assignment)
                    .amount(compensationAmount.negate())
                    .type("COMPENSATION_DEBIT")
                    .description("0.1% Freelancer compensation on job '" + request.getTitle() + "' due to post modification cancellation within 5m")
                    .createdAt(LocalDateTime.now())
                    .build();
            transactionRepository.save(clientTx);

            BigDecimal freelancerBal = freelancer.getBalance() != null ? freelancer.getBalance() : BigDecimal.ZERO;
            freelancer.setBalance(freelancerBal.add(compensationAmount));

            Transaction freelancerTx = Transaction.builder()
                    .user(freelancer)
                    .workAssignment(assignment)
                    .amount(compensationAmount)
                    .type("COMPENSATION")
                    .description("0.1% Compensation received for post modification cancellation within 5m on '" + request.getTitle() + "'")
                    .createdAt(LocalDateTime.now())
                    .build();
            transactionRepository.save(freelancerTx);

            userRepository.save(client);
            userRepository.save(freelancer);
        }

        assignment.setStatus(AssignmentStatus.CANCELLED_BY_FREELANCER);
        assignment.setCancellationReason(reason);
        assignmentRepository.save(assignment);

        request.setStatus(WorkStatus.OPEN);
        requestRepository.save(request);

        // Notify client
        Notification notif = Notification.builder()
                .user(client)
                .type("POST_CANCELLED")
                .title("Freelancer Cancelled: " + request.getTitle())
                .message("@" + freelancer.getUsername() + " cancelled the assignment. Reason: \"" + reason + "\"."
                        + (isEligibleForCompensation ? " Freelancer received $" + compensationAmount + " in compensation." : ""))
                .referenceId(request.getId())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notif);

        return CancelAssignmentResponse.builder()
                .message("Assignment cancelled successfully." + (isEligibleForCompensation ? " You received $" + compensationAmount + " in compensation." : ""))
                .compensated(isEligibleForCompensation)
                .compensationAmount(compensationAmount)
                .build();
    }

    @Override
    @Transactional
    public WorkAssignmentResponse requestRevision(Long clientId, Long workRequestId, RevisionRequest revisionRequest) {
        WorkAssignment assignment = assignmentRepository.findByWorkRequestId(workRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found for this work request."));

        if (assignment.getStatus() != AssignmentStatus.DONE) {
            throw new IllegalArgumentException("Can only request revisions for submitted work in DONE status.");
        }

        assignment.setFeedback(revisionRequest.getFeedback().trim());
        int currentCount = assignment.getRevisionCount() != null ? assignment.getRevisionCount() : 0;
        assignment.setRevisionCount(currentCount + 1);
        assignment.setStatus(AssignmentStatus.REVISION_REQUESTED);
        assignment = assignmentRepository.save(assignment);

        WorkRequest req = assignment.getWorkRequest();
        Notification notif = Notification.builder()
                .user(assignment.getFreelancer())
                .type("REVISION_REQUESTED")
                .title("Revisions Requested: " + req.getTitle())
                .message("The client requested changes on '" + req.getTitle() + "'. Feedback: \"" + revisionRequest.getFeedback().trim() + "\"")
                .referenceId(req.getId())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notif);

        return EntityDtoMapper.toWorkAssignmentResponse(assignment);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"publicProfiles", "availableWork"}, allEntries = true)
    public MessageResponse payForWork(Long clientId, Long workRequestId, PayWorkRequest payRequest) {
        WorkAssignment assignment = assignmentRepository.findByWorkRequestId(workRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found for this work request."));

        if (assignment.getStatus() != AssignmentStatus.DONE) {
            throw new IllegalArgumentException("Work is not DONE yet. Freelancer must submit first.");
        }

        if (payRequest != null) {
            if (payRequest.getRating() != null && payRequest.getRating() >= 1 && payRequest.getRating() <= 5) {
                assignment.setRating(payRequest.getRating());
            }
            if (payRequest.getReview() != null && !payRequest.getReview().trim().isEmpty()) {
                assignment.setReview(payRequest.getReview().trim());
            }
        }

        assignment.setStatus(AssignmentStatus.COMPLETED);
        assignment.setReviewedAt(LocalDateTime.now());

        WorkRequest request = assignment.getWorkRequest();
        request.setStatus(WorkStatus.COMPLETED);

        BigDecimal dealAmount = request.getAmount();

        // Deduct full dealAmount from client
        User client = userRepository.findById(request.getClient().getId())
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        BigDecimal clientBal = client.getBalance() != null ? client.getBalance() : BigDecimal.ZERO;
        if (clientBal.compareTo(dealAmount) < 0) {
            throw new IllegalArgumentException("Client has insufficient balance ($" + clientBal
                    + ") to release payment of $" + dealAmount + ".");
        }
        client.setBalance(clientBal.subtract(dealAmount));

        Transaction debit = Transaction.builder()
                .user(client)
                .workAssignment(assignment)
                .amount(dealAmount.negate())
                .type("DEBIT")
                .description("Payment for job: \"" + request.getTitle() + "\" to @" + assignment.getFreelancer().getUsername())
                .createdAt(LocalDateTime.now())
                .build();

        // 0.1% Admin Platform Commission
        BigDecimal adminCommission = dealAmount.multiply(adminCommissionRate).setScale(2, RoundingMode.HALF_UP);
        if (adminCommission.compareTo(new BigDecimal("0.01")) < 0 && dealAmount.compareTo(BigDecimal.ZERO) > 0) {
            adminCommission = new BigDecimal("0.01");
        }
        BigDecimal netFreelancerPayout = dealAmount.subtract(adminCommission);

        Optional<User> adminOpt = userRepository.findFirstByRole(Role.ROLE_ADMIN);
        if (adminOpt.isPresent()) {
            User admin = adminOpt.get();
            BigDecimal adminBal = admin.getBalance() != null ? admin.getBalance() : BigDecimal.ZERO;
            admin.setBalance(adminBal.add(adminCommission));
            userRepository.save(admin);

            Transaction adminTx = Transaction.builder()
                    .user(admin)
                    .workAssignment(assignment)
                    .amount(adminCommission)
                    .type("COMMISSION")
                    .description("Platform fee (0.1%) on job #" + request.getId() + " ('" + request.getTitle() + "') from client @" + client.getUsername())
                    .createdAt(LocalDateTime.now())
                    .build();
            transactionRepository.save(adminTx);
        } else {
            netFreelancerPayout = dealAmount;
        }

        // Credit net payout to Freelancer
        User freelancer = userRepository.findById(assignment.getFreelancer().getId())
                .orElseThrow(() -> new IllegalArgumentException("Freelancer not found"));
        BigDecimal freelancerBal = freelancer.getBalance() != null ? freelancer.getBalance() : BigDecimal.ZERO;
        freelancer.setBalance(freelancerBal.add(netFreelancerPayout));

        Transaction payment = Transaction.builder()
                .user(freelancer)
                .workAssignment(assignment)
                .amount(netFreelancerPayout)
                .type("PAYMENT")
                .description("Payout received for job: \"" + request.getTitle() + "\" (Net $" + netFreelancerPayout + " after $" + adminCommission + " platform fee) from @" + client.getUsername())
                .createdAt(LocalDateTime.now())
                .build();

        if (client.isLocked()) {
            client.setLocked(false);
        }

        assignmentRepository.save(assignment);
        requestRepository.save(request);
        userRepository.save(client);
        userRepository.save(freelancer);
        transactionRepository.save(debit);
        transactionRepository.save(payment);

        // Update Redis Leaderboard stats in real-time
        try {
            leaderboardService.recordCompletedGig(freelancer.getUsername());
            if (payRequest != null && payRequest.getRating() != null) {
                leaderboardService.recordRating(freelancer.getUsername(), (double) payRequest.getRating());
            }
        } catch (Exception e) {
            // non-critical
        }

        Notification notif = Notification.builder()
                .user(freelancer)
                .type("PAYMENT_RECEIVED")
                .title("Payment Received: " + request.getTitle())
                .message("Client released payment of $" + netFreelancerPayout + " (net after 0.1% platform fee) for '" + request.getTitle() + "'.")
                .referenceId(request.getId())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notif);

        return MessageResponse.builder()
                .message("Payment successful!")
                .build();
    }
}
