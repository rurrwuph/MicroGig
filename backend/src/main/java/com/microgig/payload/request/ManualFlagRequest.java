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
public class ManualFlagRequest {

    @NotBlank(message = "Moderation reason cannot be blank")
    @Size(max = 1000, message = "Reason cannot exceed 1000 characters")
    private String moderationReason;
}
