package com.microgig.payload.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppealRequest {

    @Size(max = 1000, message = "Appeal notes must not exceed 1000 characters")
    private String appealNotes;
}
