package com.microgig.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_requests", indexes = {
        @Index(name = "idx_wr_client_id", columnList = "client_id"),
        @Index(name = "idx_wr_status", columnList = "status"),
        @Index(name = "idx_wr_created_at", columnList = "created_at"),
        @Index(name = "idx_wr_status_category", columnList = "status, category")
})
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

    private LocalDateTime cancelledAt;

    private LocalDateTime lastModifiedAt;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
