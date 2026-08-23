package com.microgig.repository;

import com.microgig.model.User;
import com.microgig.model.WorkRequest;
import com.microgig.model.WorkStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkRequestRepository extends JpaRepository<WorkRequest, Long> {

    List<WorkRequest> findByClient(User client);

    List<WorkRequest> findByClientOrderByCreatedAtDesc(User client);

    @Query("SELECT w FROM WorkRequest w WHERE w.status = :status ORDER BY w.createdAt DESC")
    List<WorkRequest> findByStatusOrderByCreatedAtDesc(@Param("status") WorkStatus status);

    @Query("SELECT w FROM WorkRequest w WHERE w.status = com.microgig.model.WorkStatus.FLAGGED ORDER BY w.appealRequested DESC, w.flaggedAt DESC, w.createdAt DESC")
    List<WorkRequest> findFlaggedWorkRequests();

    long countByStatus(WorkStatus status);

    @Query(value = "SELECT COUNT(*) FROM work_requests WHERE client_id = :clientId AND status = :status AND is_deleted = false", nativeQuery = true)
    long countByClientAndStatusNative(@Param("clientId") Long clientId, @Param("status") String status);
}
