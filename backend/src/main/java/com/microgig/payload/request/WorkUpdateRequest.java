package com.microgig.payload.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
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
public class WorkUpdateRequest {

    @Size(max = 255, message = "Title cannot exceed 255 characters")
    private String title;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    @DecimalMin(value = "0.01", message = "Amount must be positive")
    private BigDecimal amount;

    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd['T'[HH:mm:ss[.SSS][XXX][X]]]", shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
    private LocalDateTime deadline;

    private String category;

    private String skills;
}
