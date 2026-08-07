package com.microgig.service;

import com.microgig.payload.request.LoginRequest;
import com.microgig.payload.request.SignupRequest;
import com.microgig.payload.response.JwtResponse;
import com.microgig.payload.response.MessageResponse;

public interface AuthService {

    JwtResponse authenticateUser(LoginRequest loginRequest);

    MessageResponse registerUser(SignupRequest signupRequest);
}
