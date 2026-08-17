package com.microgig.security.oauth2;

import com.microgig.model.Role;
import com.microgig.model.User;
import com.microgig.repository.UserRepository;
import com.microgig.security.JwtUtils;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${microgig.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        if (response.isCommitted()) {
            return;
        }

        User user = null;
        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomOAuth2User customOAuth2User) {
            user = customOAuth2User.getUser();
        } else if (principal instanceof OAuth2User oAuth2User) {
            String email = oAuth2User.getAttribute("email");
            String name = oAuth2User.getAttribute("name");

            if (email != null && !email.isBlank()) {
                email = email.trim().toLowerCase();
                Optional<User> userOpt = userRepository.findByEmail(email);
                if (userOpt.isPresent()) {
                    user = userOpt.get();
                    if ((user.getFullName() == null || user.getFullName().isBlank()) && name != null) {
                        user.setFullName(name);
                        user = userRepository.save(user);
                    }
                } else {
                    String baseUsername = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "_");
                    String username = baseUsername;
                    int counter = 1;
                    while (userRepository.existsByUsername(username)) {
                        username = baseUsername + counter++;
                    }

                    user = User.builder()
                            .username(username)
                            .email(email)
                            .fullName(name != null ? name : baseUsername)
                            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                            .role(Role.ROLE_FREELANCER)
                            .balance(BigDecimal.ZERO)
                            .isLocked(false)
                            .createdAt(LocalDateTime.now())
                            .build();

                    user = userRepository.save(user);
                }
            }
        }

        if (user == null) {
            log.error("Failed to extract or create user from OAuth2 principal: {}", principal);
            response.sendRedirect(frontendUrl + "/login?error=" + URLEncoder.encode("Authentication failed: Unable to extract user profile from Google", StandardCharsets.UTF_8));
            return;
        }

        String token = jwtUtils.generateTokenFromUsername(user.getUsername());

        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/login")
                .queryParam("oauthToken", token)
                .queryParam("id", user.getId())
                .queryParam("username", URLEncoder.encode(user.getUsername(), StandardCharsets.UTF_8))
                .queryParam("email", URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8))
                .queryParam("role", user.getRole().name())
                .queryParam("balance", user.getBalance())
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
