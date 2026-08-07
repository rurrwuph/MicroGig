package com.microgig.service;

import com.microgig.payload.response.MessageResponse;

import java.util.Map;

public interface AdminService {

    Map<String, Object> getSystemStats();

    MessageResponse toggleUserLock(Long userId, boolean locked);
}
