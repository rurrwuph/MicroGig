package com.microgig.repository;

import com.microgig.model.ApplicationStatus;
import com.microgig.model.User;
import com.microgig.model.WorkApplication;
import com.microgig.model.WorkRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkApplicationRepository extends JpaRepository<WorkApplication, Long> {

    List<WorkApplication> findByWorkRequestOrderByAppliedAtDesc(WorkRequest workRequest);

    List<WorkApplication> findByFreelancerOrderByAppliedAtDesc(User freelancer);

    Optional<WorkApplication> findByWorkRequestIdAndFreelancerId(Long workRequestId, Long freelancerId);

    boolean existsByWorkRequestIdAndFreelancerId(Long workRequestId, Long freelancerId);

    long countByWorkRequestIdAndStatus(Long workRequestId, ApplicationStatus status);

    List<WorkApplication> findByWorkRequestIdAndStatus(Long workRequestId, ApplicationStatus status);
}
