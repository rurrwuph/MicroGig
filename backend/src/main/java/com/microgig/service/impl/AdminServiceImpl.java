package com.microgig.service.impl;

import com.microgig.model.User;
import com.microgig.payload.response.MessageResponse;
import com.microgig.repository.UserRepository;
import com.microgig.repository.WorkAssignmentRepository;
import com.microgig.repository.WorkRequestRepository;
import com.microgig.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final WorkRequestRepository workRequestRepository;
    private final WorkAssignmentRepository workAssignmentRepository;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getSystemStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalClients", userRepository.countUsersByRoleNative("ROLE_CLIENT"));
        stats.put("totalFreelancers", userRepository.countUsersByRoleNative("ROLE_FREELANCER"));
        stats.put("totalJobs", workRequestRepository.count());
        stats.put("totalAssignments", workAssignmentRepository.count());
        return stats;
    }

    @Override
    @Transactional
    public MessageResponse toggleUserLock(Long userId, boolean locked) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        user.setLocked(locked);
        userRepository.save(user);

        return MessageResponse.builder()
                .message("User " + user.getUsername() + " locked status set to: " + locked)
                .build();
    }
}
