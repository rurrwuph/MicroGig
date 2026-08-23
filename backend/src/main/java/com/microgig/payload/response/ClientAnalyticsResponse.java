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
public class ClientAnalyticsResponse {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private BigDecimal balance;
    private boolean locked;
    private Long totalPostedJobs;
    private Long activeGigsCount;
    private Long completedGigsCount;
    private BigDecimal totalSpent;
    private LocalDateTime createdAt;
}
