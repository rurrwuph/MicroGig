package com.microgig.payload.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelAssignmentResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private String message;
    private boolean compensated;
    private BigDecimal compensationAmount;
}
