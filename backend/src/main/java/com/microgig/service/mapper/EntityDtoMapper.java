package com.microgig.service.mapper;

import com.microgig.model.*;
import com.microgig.payload.response.*;

public final class EntityDtoMapper {

    private EntityDtoMapper() {}

    public static UserProfileResponse toUserProfileResponse(User user) {
        if (user == null) return null;
        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .balance(user.getBalance())
                .isLocked(user.isLocked())
                .fullName(user.getFullName() != null ? user.getFullName() : "")
                .headline(user.getHeadline() != null ? user.getHeadline() : "")
                .bio(user.getBio() != null ? user.getBio() : "")
                .skills(user.getSkills() != null ? user.getSkills() : "")
                .portfolioUrl(user.getPortfolioUrl() != null ? user.getPortfolioUrl() : "")
                .githubUrl(user.getGithubUrl() != null ? user.getGithubUrl() : "")
                .createdAt(user.getCreatedAt())
                .build();
    }

    public static WorkResponse.ClientSummaryDto toClientSummaryDto(User user) {
        if (user == null) return null;
        return WorkResponse.ClientSummaryDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName() != null ? user.getFullName() : "")
                .build();
    }

    public static WorkAssignmentResponse.FreelancerSummaryDto toFreelancerSummaryDto(User user) {
        if (user == null) return null;
        return WorkAssignmentResponse.FreelancerSummaryDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName() != null ? user.getFullName() : "")
                .build();
    }

    public static WorkResponse toWorkResponse(WorkRequest workRequest) {
        if (workRequest == null) return null;
        return WorkResponse.builder()
                .id(workRequest.getId())
                .title(workRequest.getTitle())
                .description(workRequest.getDescription())
                .amount(workRequest.getAmount())
                .deadline(workRequest.getDeadline())
                .status(workRequest.getStatus() != null ? workRequest.getStatus().name() : null)
                .category(workRequest.getCategory() != null ? workRequest.getCategory() : "")
                .skills(workRequest.getSkills() != null ? workRequest.getSkills() : "")
                .moderationReason(workRequest.getModerationReason())
                .flaggedAt(workRequest.getFlaggedAt())
                .appealRequested(workRequest.getAppealRequested())
                .appealNotes(workRequest.getAppealNotes())
                .appealRequestedAt(workRequest.getAppealRequestedAt())
                .isDeleted(workRequest.getIsDeleted())
                .deletedAt(workRequest.getDeletedAt())
                .cancelledAt(workRequest.getCancelledAt())
                .lastModifiedAt(workRequest.getLastModifiedAt())
                .createdAt(workRequest.getCreatedAt())
                .client(toClientSummaryDto(workRequest.getClient()))
                .build();
    }

    public static WorkAssignmentResponse toWorkAssignmentResponse(WorkAssignment assignment) {
        if (assignment == null) return null;
        return WorkAssignmentResponse.builder()
                .id(assignment.getId())
                .workRequest(toWorkResponse(assignment.getWorkRequest()))
                .freelancer(toFreelancerSummaryDto(assignment.getFreelancer()))
                .status(assignment.getStatus() != null ? assignment.getStatus().name() : null)
                .submissionNotes(assignment.getSubmissionNotes() != null ? assignment.getSubmissionNotes() : "")
                .submissionUrl(assignment.getSubmissionUrl() != null ? assignment.getSubmissionUrl() : "")
                .feedback(assignment.getFeedback() != null ? assignment.getFeedback() : "")
                .rating(assignment.getRating())
                .review(assignment.getReview() != null ? assignment.getReview() : "")
                .revisionCount(assignment.getRevisionCount() != null ? assignment.getRevisionCount() : 0)
                .cancellationReason(assignment.getCancellationReason() != null ? assignment.getCancellationReason() : "")
                .acceptedAt(assignment.getAcceptedAt())
                .submittedAt(assignment.getSubmittedAt())
                .reviewedAt(assignment.getReviewedAt())
                .build();
    }

    public static TransactionResponse toTransactionResponse(Transaction transaction) {
        if (transaction == null) return null;
        return TransactionResponse.builder()
                .id(transaction.getId())
                .userId(transaction.getUser() != null ? transaction.getUser().getId() : null)
                .username(transaction.getUser() != null ? transaction.getUser().getUsername() : null)
                .workAssignmentId(transaction.getWorkAssignment() != null ? transaction.getWorkAssignment().getId() : null)
                .amount(transaction.getAmount())
                .type(transaction.getType())
                .description(transaction.getDescription())
                .createdAt(transaction.getCreatedAt())
                .build();
    }

    public static NotificationResponse toNotificationResponse(Notification notification) {
        if (notification == null) return null;
        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(notification.getUser() != null ? notification.getUser().getId() : null)
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .referenceId(notification.getReferenceId())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    public static WorkApplicationResponse toWorkApplicationResponse(WorkApplication application) {
        if (application == null) return null;
        User freelancer = application.getFreelancer();
        WorkRequest req = application.getWorkRequest();

        return WorkApplicationResponse.builder()
                .id(application.getId())
                .workRequestId(req != null ? req.getId() : null)
                .workRequestTitle(req != null ? req.getTitle() : "")
                .workRequestAmount(req != null ? req.getAmount() : null)
                .workRequestStatus(req != null && req.getStatus() != null ? req.getStatus().name() : null)
                .freelancerId(freelancer != null ? freelancer.getId() : null)
                .freelancerUsername(freelancer != null ? freelancer.getUsername() : "")
                .freelancerFullName(freelancer != null && freelancer.getFullName() != null ? freelancer.getFullName() : "")
                .proposalNotes(application.getProposalNotes())
                .bidAmount(application.getBidAmount())
                .estimatedDays(application.getEstimatedDays())
                .status(application.getStatus())
                .appliedAt(application.getAppliedAt())
                .decidedAt(application.getDecidedAt())
                .build();
    }
}

