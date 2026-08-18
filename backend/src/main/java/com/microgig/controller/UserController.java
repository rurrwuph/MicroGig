package com.microgig.controller;

import com.microgig.payload.request.ChangePasswordRequest;
import com.microgig.payload.request.ProfileUpdateRequest;
import com.microgig.payload.request.TopUpRequest;
import com.microgig.payload.request.WithdrawRequest;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.PublicProfileResponse;
import com.microgig.payload.response.TransactionResponse;
import com.microgig.payload.response.UserProfileResponse;
import com.microgig.payload.response.WalletOperationResponse;
import com.microgig.security.UserDetailsImpl;
import com.microgig.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * GET /api/user/me
     * Returns current authenticated user profile & balance.
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserProfileResponse response = userService.getCurrentUser(userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/user/profile
     * Returns full profile details for the authenticated user.
     */
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserProfileResponse response = userService.getProfile(userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * PUT /api/user/profile
     * Updates profile details.
     */
    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(@Valid @RequestBody ProfileUpdateRequest request,
                                                             @AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserProfileResponse response = userService.updateProfile(userDetails.getId(), request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/user/change-password
     * Allows changing user account password securely.
     */
    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                                          @AuthenticationPrincipal UserDetailsImpl userDetails) {
        MessageResponse response = userService.changePassword(userDetails.getId(), request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/user/transactions
     * Returns transaction history for the authenticated user.
     */
    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionResponse>> getUserTransactions(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<TransactionResponse> response = userService.getUserTransactions(userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/user/topup
     * Adds funds to the authenticated user's wallet.
     */
    @PostMapping("/topup")
    public ResponseEntity<WalletOperationResponse> topUp(@Valid @RequestBody TopUpRequest request,
                                                         @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WalletOperationResponse response = userService.topUp(userDetails.getId(), request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/user/withdraw
     * Simulates withdrawing funds from wallet.
     */
    @PostMapping("/withdraw")
    public ResponseEntity<WalletOperationResponse> withdraw(@Valid @RequestBody WithdrawRequest request,
                                                            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        WalletOperationResponse response = userService.withdraw(userDetails.getId(), request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/user/public/{username}
     * Returns public profile details, metrics, and verified review history.
     */
    @GetMapping("/public/{username}")
    public ResponseEntity<PublicProfileResponse> getPublicProfile(@PathVariable String username) {
        PublicProfileResponse response = userService.getPublicProfile(username);
        return ResponseEntity.ok(response);
    }
}
