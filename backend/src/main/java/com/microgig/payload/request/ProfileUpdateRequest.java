package com.microgig.payload.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileUpdateRequest {
    private String fullName;
    private String headline;
    private String bio;
    private String skills;
    private String portfolioUrl;
    private String githubUrl;
}
