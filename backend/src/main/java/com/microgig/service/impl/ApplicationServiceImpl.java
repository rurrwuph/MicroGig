package com.microgig.service.impl;

import com.microgig.model.*;
import com.microgig.payload.request.WorkApplicationRequest;
import com.microgig.payload.response.WorkApplicationResponse;
import com.microgig.repository.*;
import com.microgig.service.ApplicationService;
import com.microgig.service.mapper.EntityDtoMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApplicationServiceImpl implements ApplicationService {

    private final WorkApplicationRepository applicationRepository;
    private final WorkRequestRepository requestRepository;
    private final WorkAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    @Override
    @Transactional
    public WorkApplicationResponse applyForWork(Long freelancerId, Long workRequestId, WorkApplicationRequest request) {
        User freelancer = userRepository.findById(freelancerId)
                .orElseThrow(() -> new IllegalArgumentException("Freelancer not found with id: " + freelancerId));

        if (freelancer.getRole() != Role.ROLE_FREELANCER) {
            throw new IllegalArgumentException("Only freelancers can apply for work.");
        }

        WorkRequest workRequest = requestRepository.findById(workRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Work request not found with id: " + workRequestId));

        if (workRequest.getStatus() != WorkStatus.OPEN) {
            throw new IllegalArgumentException("Work request is not open for applications. Current status: " + workRequest.getStatus());
        }

        if (workRequest.getClient().getId().equals(freelancerId)) {
            throw new IllegalArgumentException("You cannot apply to your own job post.");
        }

        if (applicationRepository.existsByWorkRequestIdAndFreelancerId(workRequestId, freelancerId)) {
            throw new IllegalArgumentException("You have already submitted an application for this job post.");
        }

        WorkApplication application = WorkApplication.builder()
                .workRequest(workRequest)
                .freelancer(freelancer)
                .proposalNotes(request.getProposalNotes().trim())
                .bidAmount(request.getBidAmount())
                .estimatedDays(request.getEstimatedDays())
                .status(ApplicationStatus.PENDING)
                .appliedAt(LocalDateTime.now())
                .build();

        application = applicationRepository.save(application);

        // Notify client
        Notification notif = Notification.builder()
                .user(workRequest.getClient())
                .type("WORK_APPLICATION_RECEIVED")
                .title("New Application: " + workRequest.getTitle())
                .message("@" + freelancer.getUsername() + " submitted a proposal for $" + application.getBidAmount() + " (" + application.getEstimatedDays() + " days).")
                .referenceId(workRequest.getId())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notif);

        return EntityDtoMapper.toWorkApplicationResponse(application);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkApplicationResponse> getApplicationsForWork(Long userId, Long workRequestId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        WorkRequest workRequest = requestRepository.findById(workRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Work request not found with id: " + workRequestId));

        boolean isClientOwner = workRequest.getClient().getId().equals(userId);
        boolean isAdmin = user.getRole() == Role.ROLE_ADMIN;

        if (!isClientOwner && !isAdmin) {
            throw new IllegalArgumentException("You are not authorized to view applications for this job.");
        }

        return applicationRepository.findByWorkRequestOrderByAppliedAtDesc(workRequest).stream()
                .map(EntityDtoMapper::toWorkApplicationResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkApplicationResponse> getMyApplications(Long freelancerId) {
        User freelancer = userRepository.findById(freelancerId)
                .orElseThrow(() -> new IllegalArgumentException("Freelancer not found with id: " + freelancerId));

        return applicationRepository.findByFreelancerOrderByAppliedAtDesc(freelancer).stream()
                .map(EntityDtoMapper::toWorkApplicationResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = "availableWork", allEntries = true)
    public WorkApplicationResponse acceptApplication(Long clientId, Long workRequestId, Long applicationId) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found with id: " + clientId));

        WorkRequest workRequest = requestRepository.findById(workRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Work request not found with id: " + workRequestId));

        if (!workRequest.getClient().getId().equals(clientId) && client.getRole() != Role.ROLE_ADMIN) {
            throw new IllegalArgumentException("Only the job creator or an administrator can accept applications.");
        }

        if (workRequest.getStatus() != WorkStatus.OPEN) {
            throw new IllegalArgumentException("Cannot accept application. Job status is: " + workRequest.getStatus());
        }

        WorkApplication chosenApp = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with id: " + applicationId));

        if (!chosenApp.getWorkRequest().getId().equals(workRequestId)) {
            throw new IllegalArgumentException("Application does not belong to this work request.");
        }

        if (chosenApp.getStatus() != ApplicationStatus.PENDING) {
            throw new IllegalArgumentException("Application is already " + chosenApp.getStatus());
        }

        LocalDateTime now = LocalDateTime.now();

        // Accept chosen application
        chosenApp.setStatus(ApplicationStatus.ACCEPTED);
        chosenApp.setDecidedAt(now);
        applicationRepository.save(chosenApp);

        // Reject other pending applications
        List<WorkApplication> otherApps = applicationRepository.findByWorkRequestOrderByAppliedAtDesc(workRequest);
        for (WorkApplication app : otherApps) {
            if (!app.getId().equals(chosenApp.getId()) && app.getStatus() == ApplicationStatus.PENDING) {
                app.setStatus(ApplicationStatus.REJECTED);
                app.setDecidedAt(now);
                applicationRepository.save(app);

                // Notify rejected freelancer
                Notification rejNotif = Notification.builder()
                        .user(app.getFreelancer())
                        .type("APPLICATION_REJECTED")
                        .title("Application Update: " + workRequest.getTitle())
                        .message("The client has selected another freelancer for '" + workRequest.getTitle() + "'.")
                        .referenceId(workRequest.getId())
                        .isRead(false)
                        .createdAt(now)
                        .build();
                notificationRepository.save(rejNotif);
            }
        }

        // Transition WorkRequest status and update agreed price to the accepted proposal's bid amount
        if (chosenApp.getBidAmount() != null) {
            workRequest.setAmount(chosenApp.getBidAmount());
        }
        workRequest.setStatus(WorkStatus.ASSIGNED);
        requestRepository.save(workRequest);

        // Create or update WorkAssignment
        WorkAssignment assignment = assignmentRepository.findByWorkRequestId(workRequestId)
                .orElse(new WorkAssignment());

        assignment.setWorkRequest(workRequest);
        assignment.setFreelancer(chosenApp.getFreelancer());
        assignment.setStatus(AssignmentStatus.ACCEPTED);
        assignment.setAcceptedAt(now);
        assignment.setCancellationReason(null);
        assignmentRepository.save(assignment);

        // Notify accepted freelancer
        Notification acceptNotif = Notification.builder()
                .user(chosenApp.getFreelancer())
                .type("APPLICATION_ACCEPTED")
                .title("Proposal Accepted! " + workRequest.getTitle())
                .message("Congratulations! @" + workRequest.getClient().getUsername() + " accepted your proposal of $" + chosenApp.getBidAmount() + " for '" + workRequest.getTitle() + "'. Work is now active.")
                .referenceId(workRequest.getId())
                .isRead(false)
                .createdAt(now)
                .build();
        notificationRepository.save(acceptNotif);

        return EntityDtoMapper.toWorkApplicationResponse(chosenApp);
    }

    @Override
    @Transactional
    public WorkApplicationResponse rejectApplication(Long clientId, Long workRequestId, Long applicationId) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found with id: " + clientId));

        WorkRequest workRequest = requestRepository.findById(workRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Work request not found with id: " + workRequestId));

        if (!workRequest.getClient().getId().equals(clientId) && client.getRole() != Role.ROLE_ADMIN) {
            throw new IllegalArgumentException("Only the job creator or an administrator can reject applications.");
        }

        WorkApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with id: " + applicationId));

        if (!app.getWorkRequest().getId().equals(workRequestId)) {
            throw new IllegalArgumentException("Application does not belong to this work request.");
        }

        LocalDateTime now = LocalDateTime.now();
        app.setStatus(ApplicationStatus.REJECTED);
        app.setDecidedAt(now);
        applicationRepository.save(app);

        // Notify rejected freelancer
        Notification rejNotif = Notification.builder()
                .user(app.getFreelancer())
                .type("APPLICATION_REJECTED")
                .title("Application Update: " + workRequest.getTitle())
                .message("The client has declined your proposal for '" + workRequest.getTitle() + "'.")
                .referenceId(workRequest.getId())
                .isRead(false)
                .createdAt(now)
                .build();
        notificationRepository.save(rejNotif);

        return EntityDtoMapper.toWorkApplicationResponse(app);
    }
}
