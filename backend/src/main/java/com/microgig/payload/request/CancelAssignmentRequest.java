package com.microgig.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelAssignmentRequest {

    @NotBlank(message = "Cancellation reason is required")
    @Size(min = 5, max = 1000, message = "Please provide a valid cancellation reason (minimum 5 characters)")
    private String reason;
}
