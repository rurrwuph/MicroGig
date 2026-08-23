package com.microgig.payload.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FreelancerAnalyticsResponse {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private BigDecimal balance;
    private boolean locked;
    private Long completedGigsCount;
    private Long activeGigsCount;
    private Double averageRating;
    private Integer totalReviews;
    private LocalDateTime createdAt;
}
