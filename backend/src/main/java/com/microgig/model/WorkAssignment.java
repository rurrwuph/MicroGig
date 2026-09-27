package com.microgig.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "work_assignments", indexes = {
        @Index(name = "idx_wa_work_req_id", columnList = "work_request_id"),
        @Index(name = "idx_wa_freelancer_id", columnList = "freelancer_id"),
        @Index(name = "idx_wa_status", columnList = "status")
})
@Data 
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "work_request_id", nullable = false)
    private WorkRequest workRequest;

    @ManyToOne
    @JoinColumn(name = "freelancer_id")
    private User freelancer;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssignmentStatus status = AssignmentStatus.AVAILABLE;

    @Column(length = 2000)
    private String submissionNotes;

    private String submissionUrl;

    @Column(length = 2000)
    private String feedback;

    private Integer rating; // 1 to 5 stars

    @Column(length = 1000)
    private String review;

    @Builder.Default
    @Column(columnDefinition = "integer default 0")
    private Integer revisionCount = 0;

    @Column(length = 1000)
    private String cancellationReason;

    private LocalDateTime acceptedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
}
