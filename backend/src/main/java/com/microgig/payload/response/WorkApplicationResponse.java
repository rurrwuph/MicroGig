package com.microgig.payload.response;

import com.microgig.model.ApplicationStatus;
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
public class WorkApplicationResponse {

    private Long id;
    private Long workRequestId;
    private String workRequestTitle;
    private BigDecimal workRequestAmount;
    private String workRequestStatus;
    private Long freelancerId;
    private String freelancerUsername;
    private String freelancerFullName;
    private Double freelancerRating;
    private Integer freelancerCompletedCount;
    private String proposalNotes;
    private BigDecimal bidAmount;
    private Integer estimatedDays;
    private ApplicationStatus status;
    private LocalDateTime appliedAt;
    private LocalDateTime decidedAt;
}
