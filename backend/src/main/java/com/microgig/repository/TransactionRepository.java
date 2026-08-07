package com.microgig.repository;

import com.microgig.model.Transaction;
import com.microgig.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUser(User user);

    List<Transaction> findByUserOrderByCreatedAtDesc(User user);

    boolean existsByWorkAssignmentIdAndType(Long workAssignmentId, String type);

    @Query(value = "SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE user_id = :userId AND type = :type", nativeQuery = true)
    BigDecimal sumAmountByUserIdAndTypeNative(@Param("userId") Long userId, @Param("type") String type);
}
