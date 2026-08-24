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
public class PlatformEarningsResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private BigDecimal totalEarnings;
    private BigDecimal totalCompletedVolume;
    private BigDecimal commissionRate;
    private Long totalCommissionTransactions;
    private List<CommissionEntryDto> recentTransactions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommissionEntryDto implements Serializable {
        private static final long serialVersionUID = 1L;

        private Long id;
        private Long assignmentId;
        private Long jobId;
        private String jobTitle;
        private String clientUsername;
        private String freelancerUsername;
        private BigDecimal dealAmount;
        private BigDecimal commissionAmount;
        private String description;
        private LocalDateTime createdAt;
    }
}
