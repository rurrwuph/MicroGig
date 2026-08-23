package com.microgig.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationResult {
    private boolean flagged;
    private String violationCategory;
    private String matchedPattern;
    private String reason;

    public static ModerationResult clean() {
        return ModerationResult.builder()
                .flagged(false)
                .build();
    }

    public static ModerationResult flagged(String violationCategory, String matchedPattern, String reason) {
        return ModerationResult.builder()
                .flagged(true)
                .violationCategory(violationCategory)
                .matchedPattern(matchedPattern)
                .reason(reason)
                .build();
    }
}
