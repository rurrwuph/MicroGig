package com.microgig;

import com.microgig.model.Role;
import com.microgig.model.User;
import com.microgig.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@SpringBootApplication
@EnableScheduling
public class MicroGigApplication {

	public static void main(String[] args) {
		SpringApplication.run(MicroGigApplication.class, args);
	}

	@Bean
	public CommandLineRunner initDatabase(JdbcTemplate jdbcTemplate,
										  UserRepository userRepository,
										  PasswordEncoder passwordEncoder) {
		return args -> {
			try {
				// Drop outdated check constraints on status columns so new enum values (like REVISION_REQUESTED) work
				jdbcTemplate.execute("ALTER TABLE work_assignments DROP CONSTRAINT IF EXISTS work_assignments_status_check;");
			} catch (Exception ignored) {}

			try {
				jdbcTemplate.execute("ALTER TABLE work_requests DROP CONSTRAINT IF EXISTS work_requests_status_check;");
			} catch (Exception ignored) {}

			try {
				jdbcTemplate.execute("ALTER TABLE work_requests ADD COLUMN IF NOT EXISTS appeal_requested BOOLEAN NOT NULL DEFAULT FALSE;");
				jdbcTemplate.execute("ALTER TABLE work_requests ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;");
			} catch (Exception ignored) {}

			try {
				// Ensure work_assignment_id in transactions is nullable (for TOPUP events)
				jdbcTemplate.execute("ALTER TABLE transactions ALTER COLUMN work_assignment_id DROP NOT NULL;");
			} catch (Exception ignored) {}

			try {
				// Ensure revision_count has no nulls in existing rows
				jdbcTemplate.execute("UPDATE work_assignments SET revision_count = 0 WHERE revision_count IS NULL;");
			} catch (Exception ignored) {}

			try {
				// Ensure admin user exists with proper credentials (admin / admin123)
				userRepository.findByUsername("admin").ifPresentOrElse(
						admin -> {
							admin.setPassword(passwordEncoder.encode("admin123"));
							admin.setRole(Role.ROLE_ADMIN);
							admin.setLocked(false);
							userRepository.save(admin);
						},
						() -> {
							User admin = User.builder()
									.username("admin")
									.email("admin@microgig.com")
									.password(passwordEncoder.encode("admin123"))
									.role(Role.ROLE_ADMIN)
									.balance(BigDecimal.ZERO)
									.isLocked(false)
									.fullName("System Administrator")
									.headline("MicroGig Platform Admin")
									.bio("Platform super administrator managing user disputes, escrow funds, and platform security.")
									.skills("System Administration, Security, Auditing")
									.portfolioUrl("https://microgig.com")
									.githubUrl("https://github.com/microgig")
									.createdAt(LocalDateTime.now())
									.build();
							userRepository.save(admin);
						}
				);

				// Update all existing seed users with old hashes to ensure password123 is cleanly encoded
				userRepository.findAll().forEach(user -> {
					if (!"admin".equalsIgnoreCase(user.getUsername())) {
						if (user.getPassword() != null && user.getPassword().startsWith("$2b$")) {
							user.setPassword(passwordEncoder.encode("password123"));
							userRepository.save(user);
						}
					}
				});
			} catch (Exception ignored) {}
		};
	}
}
