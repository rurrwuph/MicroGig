package com.microgig.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions", indexes = {
        @Index(name = "idx_tx_user_id", columnList = "user_id"),
        @Index(name = "idx_tx_wa_type", columnList = "work_assignment_id, type"),
        @Index(name = "idx_tx_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_assignment_id", nullable = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WorkAssignment workAssignment;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String type; // PAYMENT, DEBIT, PENALTY, TOPUP, WITHDRAWAL, COMMISSION, COMPENSATION, COMPENSATION_DEBIT

    private String description;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
