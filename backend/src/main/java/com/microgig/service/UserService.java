package com.microgig.service;

import com.microgig.payload.request.ChangePasswordRequest;
import com.microgig.payload.request.ProfileUpdateRequest;
import com.microgig.payload.request.TopUpRequest;
import com.microgig.payload.request.WithdrawRequest;
import com.microgig.payload.response.MessageResponse;
import com.microgig.payload.response.PublicProfileResponse;
import com.microgig.payload.response.TransactionResponse;
import com.microgig.payload.response.UserProfileResponse;
import com.microgig.payload.response.WalletOperationResponse;

import java.util.List;

public interface UserService {

    UserProfileResponse getCurrentUser(Long userId);

    UserProfileResponse getProfile(Long userId);

    UserProfileResponse updateProfile(Long userId, ProfileUpdateRequest request);

    MessageResponse changePassword(Long userId, ChangePasswordRequest request);

    List<TransactionResponse> getUserTransactions(Long userId);

    WalletOperationResponse topUp(Long userId, TopUpRequest request);

    WalletOperationResponse withdraw(Long userId, WithdrawRequest request);

    PublicProfileResponse getPublicProfile(String username);
}
