package com.microgig.service.impl;

import com.microgig.model.Role;
import com.microgig.model.User;
import com.microgig.payload.request.LoginRequest;
import com.microgig.payload.request.SignupRequest;
import com.microgig.payload.response.JwtResponse;
import com.microgig.payload.response.MessageResponse;
import com.microgig.repository.UserRepository;
import com.microgig.security.JwtUtils;
import com.microgig.security.UserDetailsImpl;
import com.microgig.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder encoder;
    private final JwtUtils jwtUtils;

    @Override
    @Transactional(readOnly = true)
    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // Check locked status BEFORE generating JWT token
        if (!userDetails.isAccountNonLocked()) {
            throw new org.springframework.security.authentication.LockedException("Your account has been locked by an administrator. Please contact support.");
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        String role = userDetails.getAuthorities().iterator().next().getAuthority();

        // Fetch fresh balance from DB
        User userEntity = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userDetails.getUsername()));

        return JwtResponse.builder()
                .token(jwt)
                .id(userDetails.getId())
                .username(userDetails.getUsername())
                .email(userDetails.getEmail())
                .role(role)
                .balance(userEntity.getBalance())
                .build();
    }

    @Override
    @Transactional
    public MessageResponse registerUser(SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            throw new IllegalArgumentException("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new IllegalArgumentException("Error: Email is already in use!");
        }

        Role userRole;
        switch (signUpRequest.getRole().toLowerCase()) {
            case "admin":
                userRole = Role.ROLE_ADMIN;
                break;
            case "client":
                userRole = Role.ROLE_CLIENT;
                break;
            case "freelancer":
                userRole = Role.ROLE_FREELANCER;
                break;
            default:
                throw new IllegalArgumentException("Error: Role is invalid!");
        }

        User user = User.builder()
                .username(signUpRequest.getUsername().trim())
                .email(signUpRequest.getEmail().trim().toLowerCase())
                .password(encoder.encode(signUpRequest.getPassword()))
                .role(userRole)
                .balance(BigDecimal.ZERO)
                .isLocked(false)
                .build();

        userRepository.save(user);

        return MessageResponse.builder()
                .message("User registered successfully!")
                .build();
    }
}
