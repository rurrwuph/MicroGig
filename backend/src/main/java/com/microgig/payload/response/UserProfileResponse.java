package com.microgig.payload.response;

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
public class UserProfileResponse {
    private Long id;
    private String username;
    private String email;
    private String role;
    private BigDecimal balance;
    private boolean isLocked;
    private String fullName;
    private String headline;
    private String bio;
    private String skills;
    private String portfolioUrl;
    private String githubUrl;
    private LocalDateTime createdAt;
}
