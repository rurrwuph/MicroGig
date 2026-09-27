package com.microgig.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_applications", indexes = {
        @Index(name = "idx_wapp_work_req_id", columnList = "work_request_id"),
        @Index(name = "idx_wapp_freelancer_id", columnList = "freelancer_id"),
        @Index(name = "idx_wapp_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "work_request_id", nullable = false)
    private WorkRequest workRequest;

    @ManyToOne
    @JoinColumn(name = "freelancer_id", nullable = false)
    private User freelancer;

    @Column(length = 2000, nullable = false)
    private String proposalNotes;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal bidAmount;

    @Column(nullable = false)
    private Integer estimatedDays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @Column(nullable = false)
    private LocalDateTime appliedAt;

    private LocalDateTime decidedAt;
}
