package com.microgig.service;

public interface ContentModerationService {

    /**
     * Evaluates work post content (title, description, skills) using PostgreSQL Native SQL POSIX regex.
     *
     * @param title       the job title
     * @param description the job description
     * @param skills      the required skills
     * @return ModerationResult indicating if flagged and the reason
     */
    ModerationResult evaluate(String title, String description, String skills);
}
