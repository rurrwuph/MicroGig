package com.microgig.payload.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicProfileResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String username;
    private String fullName;
    private String role;
    private String headline;
    private String bio;
    private String skills;
    private String portfolioUrl;
    private String githubUrl;
    private LocalDateTime createdAt;

    // Freelancer specific metrics
    private Long completedGigs;
    private Integer totalReviews;
    private Double averageRating;
    private List<FreelancerReviewDto> reviews;

    // Client specific metrics
    private Integer totalPostedJobs;
    private Long completedJobs;
    private List<ClientRecentJobDto> recentJobs;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FreelancerReviewDto implements Serializable {
        private static final long serialVersionUID = 1L;
        private Integer rating;
        private String review;
        private LocalDateTime reviewedAt;
        private String jobTitle;
        private String jobCategory;
        private String clientName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClientRecentJobDto implements Serializable {
        private static final long serialVersionUID = 1L;
        private Long id;
        private String title;
        private String category;
        private BigDecimal amount;
        private String status;
        private LocalDateTime createdAt;
    }
}
