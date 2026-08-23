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
public class ModerationDecisionRequest {

    @NotBlank(message = "Action is required (APPROVE, REQUEST_CHANGES, REJECT_APPEAL, SUSPEND, SOFT_DELETE)")
    private String action;

    @Size(max = 1000, message = "Admin notes must not exceed 1000 characters")
    private String adminNotes;
}
