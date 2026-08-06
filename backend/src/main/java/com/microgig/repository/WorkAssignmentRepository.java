package com.microgig.repository;

import com.microgig.model.AssignmentStatus;
import com.microgig.model.User;
import com.microgig.model.WorkAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkAssignmentRepository extends JpaRepository<WorkAssignment, Long> {

    List<WorkAssignment> findByFreelancer(User freelancer);

    List<WorkAssignment> findByFreelancerOrderByIdDesc(User freelancer);

    Optional<WorkAssignment> findByWorkRequestId(Long workRequestId);

    List<WorkAssignment> findByStatus(AssignmentStatus status);

    @Query("SELECT wa FROM WorkAssignment wa WHERE wa.workRequest.client = :client ORDER BY wa.id DESC")
    List<WorkAssignment> findByClient(@Param("client") User client);

    @Query(value = "SELECT COALESCE(AVG(rating), 0.0) FROM work_assignments WHERE freelancer_id = :freelancerId AND status = 'COMPLETED' AND rating IS NOT NULL", nativeQuery = true)
    Double calculateAverageRatingNative(@Param("freelancerId") Long freelancerId);

    @Query(value = "SELECT COUNT(*) FROM work_assignments WHERE freelancer_id = :freelancerId AND status = 'COMPLETED'", nativeQuery = true)
    long countCompletedByFreelancerNative(@Param("freelancerId") Long freelancerId);
}
