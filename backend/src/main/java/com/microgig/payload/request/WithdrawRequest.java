package com.microgig.payload.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WithdrawRequest {

    @NotNull(message = "Withdrawal amount is required")
    @DecimalMin(value = "1.00", message = "Withdrawal amount must be at least $1.00")
    private BigDecimal amount;

    private String method; // e.g. "Bank Transfer", "PayPal", "Stripe"

    private String accountDetails;
}
