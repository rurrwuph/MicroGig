package com.microgig.payload.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String title;
    private String description;
    private BigDecimal amount;
    private LocalDateTime deadline;
    private String status;
    private String category;
    private String skills;

    // Moderation & Appeal Details
    private String moderationReason;
    private LocalDateTime flaggedAt;
    private Boolean appealRequested;
    private String appealNotes;
    private LocalDateTime appealRequestedAt;

    // Soft Deletion
    private Boolean isDeleted;
    private LocalDateTime deletedAt;

    private LocalDateTime cancelledAt;
    private LocalDateTime lastModifiedAt;
    private LocalDateTime createdAt;

    // Nested Client Summary
    private ClientSummaryDto client;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClientSummaryDto implements Serializable {
        private static final long serialVersionUID = 1L;
        private Long id;
        private String username;
        private String email;
        private String fullName;
    }
}
