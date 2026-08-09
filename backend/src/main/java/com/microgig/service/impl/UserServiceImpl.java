package com.microgig.service.impl;

import com.microgig.model.*;
import com.microgig.payload.request.ChangePasswordRequest;
import com.microgig.payload.request.ProfileUpdateRequest;
import com.microgig.payload.request.TopUpRequest;
import com.microgig.payload.request.WithdrawRequest;
import com.microgig.payload.response.*;
import com.microgig.repository.TransactionRepository;
import com.microgig.repository.UserRepository;
import com.microgig.repository.WorkAssignmentRepository;
import com.microgig.repository.WorkRequestRepository;
import com.microgig.service.UserService;
import com.microgig.service.mapper.EntityDtoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final WorkAssignmentRepository workAssignmentRepository;
    private final WorkRequestRepository workRequestRepository;
    private final PasswordEncoder encoder;

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        return EntityDtoMapper.toUserProfileResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(Long userId) {
        return getCurrentUser(userId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "publicProfiles", allEntries = true)
    public UserProfileResponse updateProfile(Long userId, ProfileUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getHeadline() != null) {
            user.setHeadline(request.getHeadline().trim());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio().trim());
        }
        if (request.getSkills() != null) {
            user.setSkills(request.getSkills().trim());
        }
        if (request.getPortfolioUrl() != null) {
            user.setPortfolioUrl(request.getPortfolioUrl().trim());
        }
        if (request.getGithubUrl() != null) {
            user.setGithubUrl(request.getGithubUrl().trim());
        }

        userRepository.save(user);
        return EntityDtoMapper.toUserProfileResponse(user);
    }

    @Override
    @Transactional
    public MessageResponse changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (!encoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }

        user.setPassword(encoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return MessageResponse.builder()
                .message("Password changed successfully!")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getUserTransactions(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        return transactionRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(EntityDtoMapper::toTransactionResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WalletOperationResponse topUp(Long userId, TopUpRequest request) {
        BigDecimal amount = request.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero.");
        }
        if (amount.compareTo(new BigDecimal("10000")) > 0) {
            throw new IllegalArgumentException("Maximum top-up amount is $10,000 per transaction.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        BigDecimal currentBalance = user.getBalance() != null ? user.getBalance() : BigDecimal.ZERO;
        user.setBalance(currentBalance.add(amount));
        userRepository.save(user);

        // Record Transaction
        Transaction tx = Transaction.builder()
                .user(user)
                .amount(amount)
                .type("TOPUP")
                .description("Wallet Balance Top-up")
                .createdAt(LocalDateTime.now())
                .build();
        transactionRepository.save(tx);

        return WalletOperationResponse.builder()
                .message("Top-up successful!")
                .balance(user.getBalance())
                .amount(amount)
                .method("Direct Top-up")
                .build();
    }

    @Override
    @Transactional
    public WalletOperationResponse withdraw(Long userId, WithdrawRequest request) {
        BigDecimal amount = request.getAmount();
        String method = request.getMethod() != null && !request.getMethod().isBlank()
                ? request.getMethod().trim() : "Bank Transfer";
        String accountDetails = request.getAccountDetails() != null ? request.getAccountDetails().trim() : "";

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be greater than $0.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        BigDecimal currentBalance = user.getBalance() != null ? user.getBalance() : BigDecimal.ZERO;
        if (currentBalance.compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient funds. Current balance: $" + currentBalance);
        }

        user.setBalance(currentBalance.subtract(amount));
        userRepository.save(user);

        String maskedAccount = accountDetails.length() > 4
                ? "..." + accountDetails.substring(accountDetails.length() - 4)
                : accountDetails;
        String desc = "Payout via " + method + (maskedAccount.isEmpty() ? "" : " (" + maskedAccount + ")");

        Transaction tx = Transaction.builder()
                .user(user)
                .amount(amount.negate())
                .type("WITHDRAWAL")
                .description(desc)
                .createdAt(LocalDateTime.now())
                .build();
        transactionRepository.save(tx);

        return WalletOperationResponse.builder()
                .message("Withdrawal processed successfully!")
                .balance(user.getBalance())
                .amount(amount)
                .method(method)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "publicProfiles", key = "#username")
    public PublicProfileResponse getPublicProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        PublicProfileResponse.PublicProfileResponseBuilder builder = PublicProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName() != null ? user.getFullName() : "")
                .role(user.getRole().name())
                .headline(user.getHeadline() != null ? user.getHeadline() : "")
                .bio(user.getBio() != null ? user.getBio() : "")
                .skills(user.getSkills() != null ? user.getSkills() : "")
                .portfolioUrl(user.getPortfolioUrl() != null ? user.getPortfolioUrl() : "")
                .githubUrl(user.getGithubUrl() != null ? user.getGithubUrl() : "")
                .createdAt(user.getCreatedAt());

        if (user.getRole() == Role.ROLE_FREELANCER) {
            List<WorkAssignment> assignments = workAssignmentRepository.findByFreelancer(user);
            long completedCount = assignments.stream()
                    .filter(a -> a.getStatus() == AssignmentStatus.COMPLETED)
                    .count();

            List<PublicProfileResponse.FreelancerReviewDto> reviews = assignments.stream()
                    .filter(a -> a.getStatus() == AssignmentStatus.COMPLETED && a.getRating() != null)
                    .map(a -> {
                        String clientName = "Client";
                        if (a.getWorkRequest() != null && a.getWorkRequest().getClient() != null) {
                            User c = a.getWorkRequest().getClient();
                            clientName = (c.getFullName() != null && !c.getFullName().isEmpty())
                                    ? c.getFullName() : c.getUsername();
                        }
                        return PublicProfileResponse.FreelancerReviewDto.builder()
                                .rating(a.getRating())
                                .review(a.getReview() != null ? a.getReview() : "")
                                .reviewedAt(a.getReviewedAt())
                                .jobTitle(a.getWorkRequest() != null ? a.getWorkRequest().getTitle() : "Project")
                                .jobCategory(a.getWorkRequest() != null && a.getWorkRequest().getCategory() != null
                                        ? a.getWorkRequest().getCategory() : "")
                                .clientName(clientName)
                                .build();
                    })
                    .collect(Collectors.toList());

            double avgRating = reviews.isEmpty() ? 0.0 :
                    reviews.stream().mapToInt(PublicProfileResponse.FreelancerReviewDto::getRating).average().orElse(0.0);

            builder.completedGigs(completedCount)
                    .totalReviews(reviews.size())
                    .averageRating(Math.round(avgRating * 10.0) / 10.0)
                    .reviews(reviews);
        } else {
            // Client metrics
            List<WorkRequest> postedJobs = workRequestRepository.findByClientOrderByCreatedAtDesc(user);
            long completedJobs = postedJobs.stream()
                    .filter(w -> w.getStatus() == WorkStatus.COMPLETED)
                    .count();

            List<PublicProfileResponse.ClientRecentJobDto> recentJobs = postedJobs.stream()
                    .limit(5)
                    .map(w -> PublicProfileResponse.ClientRecentJobDto.builder()
                            .id(w.getId())
                            .title(w.getTitle())
                            .category(w.getCategory() != null ? w.getCategory() : "")
                            .amount(w.getAmount())
                            .status(w.getStatus().name())
                            .createdAt(w.getCreatedAt())
                            .build())
                    .collect(Collectors.toList());

            builder.totalPostedJobs(postedJobs.size())
                    .completedJobs(completedJobs)
                    .recentJobs(recentJobs);
        }

        return builder.build();
    }
}
