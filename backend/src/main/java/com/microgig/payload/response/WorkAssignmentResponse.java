package com.microgig.payload.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkAssignmentResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private WorkResponse workRequest;
    private FreelancerSummaryDto freelancer;
    private String status;
    private String submissionNotes;
    private String submissionUrl;
    private String feedback;
    private Integer rating;
    private String review;
    private Integer revisionCount;
    private String cancellationReason;
    private LocalDateTime acceptedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FreelancerSummaryDto implements Serializable {
        private static final long serialVersionUID = 1L;
        private Long id;
        private String username;
        private String email;
        private String fullName;
    }
}
