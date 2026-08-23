package com.microgig.payload.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkApplicationRequest {

    @NotBlank(message = "Proposal notes cannot be blank")
    @Size(max = 2000, message = "Proposal notes cannot exceed 2000 characters")
    private String proposalNotes;

    @NotNull(message = "Bid amount is required")
    @DecimalMin(value = "1.00", message = "Bid amount must be at least $1.00")
    private BigDecimal bidAmount;

    @NotNull(message = "Estimated timeline (days) is required")
    @Min(value = 1, message = "Estimated days must be at least 1 day")
    @Max(value = 365, message = "Estimated days cannot exceed 365 days")
    private Integer estimatedDays;
}
