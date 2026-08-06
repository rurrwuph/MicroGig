package com.microgig.repository;

import com.microgig.model.Role;
import com.microgig.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Boolean existsByUsername(String username);

    Boolean existsByEmail(String email);

    List<User> findByRole(Role role);

    Optional<User> findFirstByRole(Role role);

    @Query("SELECT u FROM User u WHERE u.isLocked = :isLocked")
    List<User> findAllByLockedStatus(@Param("isLocked") boolean isLocked);

    @Query(value = "SELECT COUNT(*) FROM users WHERE role = :role", nativeQuery = true)
    long countUsersByRoleNative(@Param("role") String role);
}
