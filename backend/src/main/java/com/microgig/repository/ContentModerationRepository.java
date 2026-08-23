package com.microgig.repository;

import com.microgig.model.WorkRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ContentModerationRepository extends JpaRepository<WorkRequest, Long> {

    @Query(value = "SELECT CASE WHEN :content ~* :pattern THEN true ELSE false END", nativeQuery = true)
    boolean testPatternNative(@Param("content") String content, @Param("pattern") String pattern);
}
