package com.microgig.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_requests", indexes = {
        @Index(name = "idx_wr_client_id", columnList = "client_id"),
        @Index(name = "idx_wr_status", columnList = "status"),
        @Index(name = "idx_wr_created_at", columnList = "created_at"),
        @Index(name = "idx_wr_status_category", columnList = "status, category"),
        @Index(name = "idx_wr_status_appeal", columnList = "status, appeal_requested"),
        @Index(name = "idx_wr_is_deleted", columnList = "is_deleted")
})
@SQLRestriction("is_deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDateTime deadline;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkStatus status = WorkStatus.OPEN;

    private String category; // e.g. "Web Development", "Mobile Apps", "UI/UX Design", "Bug Fixes", etc.

    private String skills; // e.g. "React, Spring Boot, PostgreSQL"

    // Moderation & Audit Fields
    @Column(name = "moderation_reason", length = 1000)
    private String moderationReason;

    @Column(name = "flagged_at")
    private LocalDateTime flaggedAt;

    @Builder.Default
    @Column(name = "appeal_requested", nullable = false)
    private Boolean appealRequested = false;

    @Column(name = "appeal_notes", length = 1000)
    private String appealNotes;

    @Column(name = "appeal_requested_at")
    private LocalDateTime appealRequestedAt;

    // Soft Deletion Fields
    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    private LocalDateTime cancelledAt;

    private LocalDateTime lastModifiedAt;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
