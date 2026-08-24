package com.microgig.service.impl;

import com.microgig.repository.ContentModerationRepository;
import com.microgig.service.ContentModerationService;
import com.microgig.service.ModerationResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContentModerationServiceImpl implements ContentModerationService {

    private final ContentModerationRepository moderationRepository;

    // PostgreSQL POSIX regular expression rule sets
    private static final Map<String, RuleDefinition> RULES = new LinkedHashMap<>();

    static {
        RULES.put("OFF_PLATFORM_COMMUNICATION", new RuleDefinition(
                "\\m(whatsapp|telegram|discord|skype|wechat|signal)\\M|\\+?[0-9]{10,14}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
                "Prohibited off-platform communication method detected (WhatsApp, Telegram, Discord, Phone Number, or External Email)."
        ));

        RULES.put("OFF_PLATFORM_PAYMENT", new RuleDefinition(
                "\\m(pay\\s+outside|paypal\\s+direct|wire\\s+transfer|crypto|bitcoin|usdt|venmo|cashapp|zelle|bank\\s+transfer\\s+direct)\\M",
                "Prohibited off-platform payment request detected (Crypto, Wire Transfer, PayPal Direct, CashApp, Venmo, Zelle, or Pay Outside)."
        ));

        RULES.put("ACADEMIC_DISHONESTY_FRAUD", new RuleDefinition(
                "\\m(final\\s+exam\\s+live|proctored\\s+test|cheat|do\\s+my\\s+exam|take\\s+my\\s+test)\\M",
                "Prohibited academic dishonesty or fraud detected (Proctored Test, Live Exam, Cheating, or Exam Impersonation)."
        ));
    }

    private record RuleDefinition(String regex, String message) {}

    @Override
    public ModerationResult evaluate(String title, String description, String skills) {
        String combined = (title != null ? title : "") + " "
                + (description != null ? description : "") + " "
                + (skills != null ? skills : "");

        if (combined.isBlank()) {
            return ModerationResult.clean();
        }

        for (Map.Entry<String, RuleDefinition> entry : RULES.entrySet()) {
            String category = entry.getKey();
            RuleDefinition rule = entry.getValue();

            boolean matches = false;
            try {
                matches = moderationRepository.testPatternNative(combined, rule.regex());
            } catch (Exception e) {
                log.warn("Native SQL moderation query failed, falling back to Java regex for category {}: {}", category, e.getMessage());
                try {
                    String javaRegex = rule.regex().replace("\\m", "\\b").replace("\\M", "\\b");
                    java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(javaRegex, java.util.regex.Pattern.CASE_INSENSITIVE);
                    matches = pattern.matcher(combined).find();
                } catch (Exception ex) {
                    log.error("Java regex fallback also failed for category {}: {}", category, ex.getMessage());
                }
            }

            if (matches) {
                log.warn("Moderation Policy Violation [{}]: {}", category, rule.message());
                return ModerationResult.flagged(category, rule.regex(), rule.message());
            }
        }

        return ModerationResult.clean();
    }
}
