import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from './Toast';
import {
  IconAlert,
  IconUser,
  IconCalendar,
  IconClock,
  IconCheck,
  IconBriefcase,
  IconStar,
  IconClose,
  IconEdit,
  IconTrash,
  IconExternalLink,
  IconFileCheck,
  IconAlertTriangle,
  IconPlus,
  IconSend
} from './Icons';

const badgeClass = (status) => {
  const map = {
    AVAILABLE:                'badge-available',
    OPEN:                     'badge-open',
    ASSIGNED:                 'badge-assigned',
    ACCEPTED:                 'badge-accepted',
    IN_PROGRESS:              'badge-assigned',
    DONE:                     'badge-done',
    REVISION_REQUESTED:       'badge-revision',
    COMPLETED:                'badge-completed',
    EXPIRED:                  'badge-expired',
    CANNOT_DO:                'badge-expired',
    CANCELLED:                'badge-expired',
    CANCELLED_BY_FREELANCER:  'badge-expired',
  };
  return map[status] || 'badge-available';
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const StarRating = ({ rating, onChange, readOnly = false }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="star-rating-container" style={{ display: 'inline-flex', gap: '0.25rem' }}>
      {stars.map((star) => (
        <span
          key={star}
          style={{
            cursor: readOnly ? 'default' : 'pointer',
            transition: 'transform 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
          }}
          onClick={() => !readOnly && onChange && onChange(star)}
          title={`${star} Star${star > 1 ? 's' : ''}`}
        >
          <IconStar size={20} filled={star <= (rating || 0)} />
        </span>
      ))}
    </div>
  );
};

const MyAssignments = ({ user, setUser }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const isClient     = user?.role === 'ROLE_CLIENT';
  const isFreelancer = user?.role === 'ROLE_FREELANCER';

  // Data states
  const [myAssignments, setMyAssignments] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [clientJobs, setClientJobs] = useState([]);
  const [clientAssignments, setClientAssignments] = useState([]);
  const [applicationsMap, setApplicationsMap] = useState({});
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  // ── Modal States ──
  // 1. Deliverable Submission Pipeline (Freelancer)
  const [submitModalAssignment, setSubmitModalAssignment] = useState(null);
  const [submitStep, setSubmitStep] = useState(1);
  const [submitForm, setSubmitForm] = useState({ notes: '', url: '' });
  const [checklist, setChecklist] = useState({ testsPass: false, requirementsMet: false, cleanCode: false });
  const [submitLoading, setSubmitLoading] = useState(false);

  // 2. Freelancer Cancellation with Compensation Modal
  const [cancelModalAssignment, setCancelModalAssignment] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // 3. Client Edit Post Modal
  const [editJobModal, setEditJobModal] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '', skills: '', amount: '', deadline: '' });
  const [editLoading, setEditLoading] = useState(false);

  // 4. Client Cancel Post Modal
  const [cancelJobModal, setCancelJobModal] = useState(null);
  const [cancelJobLoading, setCancelJobLoading] = useState(false);

  // 5. Client Revision Request Modal
  const [revisionModalAssignment, setRevisionModalAssignment] = useState(null);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [revisionLoading, setRevisionLoading] = useState(false);

  // 6. Client Pay & Review Modal
  const [payModalAssignment, setPayModalAssignment] = useState(null);
  const [payForm, setPayForm] = useState({ rating: 5, review: '' });
  const [payLoading, setPayLoading] = useState(false);

  // 7. Client Appeal Modal
  const [appealModalJob, setAppealModalJob] = useState(null);
  const [appealNotes, setAppealNotes] = useState('');
  const [appealLoading, setAppealLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (isFreelancer) {
        const [assignRes, appsRes] = await Promise.all([
          api.get('/assignments/my'),
          api.get('/applications/my').catch(() => ({ data: [] }))
        ]);
        setMyAssignments(assignRes.data || []);
        setMyApplications(appsRes.data || []);
      }
      if (isClient) {
        const [jobsRes, assignRes] = await Promise.all([
          api.get('/work/my'),
          api.get('/assignments/client')
        ]);
        const jobs = jobsRes.data || [];
        setClientJobs(jobs);
        setClientAssignments(assignRes.data || []);

        // Fetch applications for open jobs
        const openJobs = jobs.filter(j => j.status === 'OPEN');
        const appsData = {};
        await Promise.all(
          openJobs.map(async (j) => {
            try {
              const res = await api.get(`/work/${j.id}/applications`);
              appsData[j.id] = res.data || [];
            } catch { /* ignore */ }
          })
        );
        setApplicationsMap(appsData);
      }
    } catch {
      toast.error('Failed to load project data.');
    } finally {
      setLoading(false);
    }
  }, [isClient, isFreelancer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshUserData = async () => {
    try {
      const res = await api.get('/user/me');
      if (res.data && res.data.balance !== undefined) {
        const updated = { ...user, balance: res.data.balance };
        localStorage.setItem('user', JSON.stringify(updated));
        if (setUser) setUser(updated);
      }
    } catch { /* non-critical */ }
  };

  /* ── CLIENT: Applications Management ── */
  const toggleJobApplications = async (jobId) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(jobId);
    if (!applicationsMap[jobId]) {
      try {
        const res = await api.get(`/work/${jobId}/applications`);
        setApplicationsMap(prev => ({ ...prev, [jobId]: res.data || [] }));
      } catch {
        toast.error('Failed to load applications.');
      }
    }
  };

  const handleAcceptApp = async (jobId, appId) => {
    try {
      await api.post(`/work/${jobId}/applications/${appId}/accept`);
      toast.success('Proposal accepted! Freelancer is now assigned and active.');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to accept proposal.';
      toast.error(typeof msg === 'string' ? msg : 'Action failed.');
    }
  };

  const handleRejectApp = async (jobId, appId) => {
    try {
      await api.post(`/work/${jobId}/applications/${appId}/reject`);
      toast.success('Proposal declined.');
      fetchData();
    } catch (err) {
      toast.error('Failed to decline proposal.');
    }
  };

  /* ── FREELANCER: Open Submit Deliverables Modal ── */
  const handleOpenSubmitModal = (assignment) => {
    setSubmitModalAssignment(assignment);
    setSubmitStep(1);
    setSubmitForm({
      notes: assignment.submissionNotes || '',
      url: assignment.submissionUrl || '',
    });
    setChecklist({ testsPass: true, requirementsMet: true, cleanCode: true });
  };

  const handleSubmitDeliverable = async (e) => {
    e.preventDefault();
    if (!submitForm.url.trim()) {
      toast.error('Please provide a submission URL.');
      return;
    }
    if (!submitForm.notes.trim()) {
      toast.error('Please provide submission notes.');
      return;
    }

    setSubmitLoading(true);
    try {
      await api.post(`/assignments/${submitModalAssignment.workRequest.id}/submit`, {
        submissionNotes: submitForm.notes.trim(),
        submissionUrl: submitForm.url.trim(),
      });
      toast.success('Deliverables submitted successfully! The client has been notified.');
      setSubmitModalAssignment(null);
      fetchData();
    } catch (err) {
      const msg = err.response?.data || 'Failed to submit work.';
      toast.error(typeof msg === 'string' ? msg : 'Submission failed.');
    } finally {
      setSubmitLoading(false);
    }
  };

  /* ── FREELANCER: Cancellation Flow ── */
  const handleOpenCancelModal = (assignment) => {
    setCancelModalAssignment(assignment);
    setCancelReason('');
  };

  const handleFreelancerCancel = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancelling.');
      return;
    }
    setCancelLoading(true);
    try {
      const res = await api.post(`/assignments/${cancelModalAssignment.workRequest.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      if (res.data?.compensated) {
        toast.success(`Assignment cancelled. You received $${Number(res.data.compensationAmount).toFixed(2)} (0.1% compensation) because the scope was modified <5m ago.`);
      } else {
        toast.success('Assignment cancelled. The job is now available on the marketplace.');
      }
      setCancelModalAssignment(null);
      fetchData();
      refreshUserData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Cancellation failed.';
      toast.error(typeof msg === 'string' ? msg : 'Cancellation failed.');
    } finally {
      setCancelLoading(false);
    }
  };

  /* ── CLIENT: Edit Post ── */
  const handleOpenEditJob = (job) => {
    setEditJobModal(job);
    setEditForm({
      title: job.title || '',
      description: job.description || '',
      category: job.category || '',
      skills: job.skills || '',
      amount: job.amount || '',
      deadline: job.deadline ? job.deadline.split('T')[0] : '',
    });
  };

  const handleSaveEditJob = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.description.trim() || !editForm.amount) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setEditLoading(true);
    try {
      const res = await api.put(`/work/${editJobModal.id}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        skills: editForm.skills.trim(),
        amount: Number(editForm.amount),
        deadline: editForm.deadline ? new Date(editForm.deadline).toISOString() : null,
      });

      if (res.data?.status === 'FLAGGED') {
        toast.warning('Job updated, but still flagged: ' + (res.data.moderationReason || 'Policy check violation detected.'));
      } else {
        toast.success(editJobModal.status === 'ASSIGNED'
          ? 'Job updated! The assigned freelancer has been notified of the scope changes.'
          : 'Job post updated and published successfully!'
        );
      }
      setEditJobModal(null);
      fetchData();
      refreshUserData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to update job.';
      toast.error(typeof msg === 'string' ? msg : 'Update failed.');
    } finally {
      setEditLoading(false);
    }
  };

  /* ── CLIENT: Submit Moderation Appeal ── */
  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    if (!appealModalJob) return;

    setAppealLoading(true);
    try {
      await api.post(`/work/${appealModalJob.id}/appeal`, {
        appealNotes: appealNotes.trim()
      });
      toast.success('Appeal submitted! An administrator will review your job post shortly.');
      setAppealModalJob(null);
      setAppealNotes('');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to submit appeal.';
      toast.error(typeof msg === 'string' ? msg : 'Appeal submission failed.');
    } finally {
      setAppealLoading(false);
    }
  };

  /* ── CLIENT: Cancel Open Post ── */
  const handleOpenCancelJob = (job) => {
    setCancelJobModal(job);
  };

  const handleConfirmCancelJob = async () => {
    setCancelJobLoading(true);
    try {
      await api.delete(`/work/${cancelJobModal.id}`);
      toast.success('Job post has been cancelled.');
      setCancelJobModal(null);
      fetchData();
    } catch (err) {
      const msg = err.response?.data || 'Failed to cancel job.';
      toast.error(typeof msg === 'string' ? msg : 'Cancellation failed.');
    } finally {
      setCancelJobLoading(false);
    }
  };

  /* ── CLIENT: Request Revision ── */
  const handleOpenRevisionModal = (assignment) => {
    setRevisionModalAssignment(assignment);
    setRevisionFeedback(assignment.feedback || '');
  };

  const handleSubmitRevision = async (e) => {
    e.preventDefault();
    if (!revisionFeedback.trim()) {
      toast.error('Please specify what changes are needed.');
      return;
    }
    setRevisionLoading(true);
    try {
      await api.post(`/assignments/${revisionModalAssignment.workRequest.id}/revision`, {
        feedback: revisionFeedback.trim(),
      });
      toast.success('Revision request sent to the freelancer.');
      setRevisionModalAssignment(null);
      fetchData();
    } catch (err) {
      const msg = err.response?.data || 'Failed to request revision.';
      toast.error(typeof msg === 'string' ? msg : 'Failed to request revision.');
    } finally {
      setRevisionLoading(false);
    }
  };

  /* ── CLIENT: Pay & Review ── */
  const handleOpenPayModal = (assignment) => {
    setPayModalAssignment(assignment);
    setPayForm({ rating: 5, review: '' });
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setPayLoading(true);
    try {
      await api.post(`/assignments/${payModalAssignment.workRequest.id}/pay`, {
        rating: payForm.rating,
        review: payForm.review.trim(),
      });
      toast.success('Payment released! Payout transferred to freelancer and 0.1% platform fee recorded.');
      setPayModalAssignment(null);
      fetchData();
      refreshUserData();
    } catch (err) {
      const msg = err.response?.data || 'Payment failed.';
      toast.error(typeof msg === 'string' ? msg : 'Payment failed.');
    } finally {
      setPayLoading(false);
    }
  };

  const isModifiedWithin5Min = (lastModifiedAt) => {
    if (!lastModifiedAt) return false;
    const diff = (new Date() - new Date(lastModifiedAt)) / 1000 / 60;
    return diff <= 5;
  };

  return (
    <div className="page-content" style={{ animation: 'fadeSlideUp 0.3s ease' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>
            {isClient ? 'My Job Posts & Candidate Applications' : 'My Work, Applications & Assignments'}
          </h1>
          <p style={{ color: 'var(--clr-text-2)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {isClient
              ? 'Review freelancer applications, accept proposals, manage active deliverables, and release escrow.'
              : 'Track submitted proposals, active deliverables, and client revision requests.'
            }
          </p>
        </div>

        {isClient && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/post-job')}>
            <IconPlus size={14} /> Post a New Job
          </button>
        )}
      </div>

      {/* ── CLIENT VIEW: Posted Jobs & Candidate Applications ── */}
      {isClient && (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconBriefcase size={18} style={{ color: 'var(--clr-primary)' }} />
            Your Posted Gigs ({clientJobs.length})
          </h2>

          {loading ? (
            <div className="skeleton-card" style={{ height: 120 }} />
          ) : clientJobs.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1.5rem', marginBottom: '2rem' }}>
              <IconBriefcase size={40} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <h3>No jobs posted yet</h3>
              <p>Post your first gig to find verified talent.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/post-job')}>
                Post a Job
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
              {clientJobs.map((job) => {
                const isAssigned = job.status === 'ASSIGNED';
                const isOpen = job.status === 'OPEN';
                const isFlagged = job.status === 'FLAGGED';
                const isSuspended = job.status === 'SUSPENDED';
                const isDone = job.status === 'COMPLETED';
                const isCancelled = job.status === 'CANCELLED';

                const assignment = clientAssignments.find(a => a.workRequest?.id === job.id);
                const jobApps = applicationsMap[job.id] || [];

                return (
                  <div key={job.id} className="assignment-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                          <span className={`badge ${badgeClass(job.status)}`}>{job.status}</span>
                          {job.category && <span className="category-badge">{job.category}</span>}
                          {isOpen && jobApps.length > 0 && (
                            <span className="badge badge-open" style={{ fontSize: '0.72rem' }}>
                              ⚡ {jobApps.length} Candidate Proposal{jobApps.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {job.lastModifiedAt && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--clr-accent)', fontWeight: 600 }}>
                              Modified {formatDate(job.lastModifiedAt)}
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--clr-text)' }}>{job.title}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                          {job.description}
                        </p>

                        {/* Moderation Alert Banner for FLAGGED posts */}
                        {isFlagged && (
                          <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--r-md)', marginTop: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                              <div style={{ flex: 1, minWidth: '220px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--clr-error)', fontWeight: 700, fontSize: '0.85rem' }}>
                                  <span>⚠️ Flagged for Policy Review</span>
                                  {job.appealRequested && (
                                    <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--clr-primary)', padding: '2px 6px', borderRadius: '4px' }}>
                                      Appeal Under Admin Review
                                    </span>
                                  )}
                                </div>
                                <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--clr-text-2)', lineHeight: 1.4 }}>
                                  {job.moderationReason || 'Prohibited contact or payment details detected.'}
                                </p>
                                {job.appealNotes && (
                                  <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>
                                    <strong>Your Appeal Note:</strong> "{job.appealNotes}"
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenEditJob(job)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <IconEdit size={13} /> Edit & Fix
                                </button>
                                {!job.appealRequested && (
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => { setAppealModalJob(job); setAppealNotes(''); }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    Appeal Flag
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Suspension Notice */}
                        {isSuspended && (
                          <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 'var(--r-md)', marginTop: '0.75rem' }}>
                            <div style={{ color: 'var(--clr-error)', fontWeight: 700, fontSize: '0.85rem' }}>
                              🛑 Suspended by Administrator
                            </div>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--clr-text-2)' }}>
                              {job.moderationReason || 'This job was suspended due to policy violations.'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--clr-primary)' }}>
                          ${Number(job.amount).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginTop: '0.2rem' }}>
                          Due: {formatDate(job.deadline)}
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Assigned Freelancer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--clr-border)', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {assignment?.freelancer ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <IconUser size={13} />
                            Assigned to: <strong style={{ color: 'var(--clr-primary)', cursor: 'pointer' }} onClick={() => navigate(`/user/${assignment.freelancer.username}`)}>
                              @{assignment.freelancer.username}
                            </strong>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--clr-text-3)' }}>
                            {isOpen ? `${jobApps.length} candidate proposal${jobApps.length !== 1 ? 's' : ''}` : isCancelled ? 'Post cancelled' : 'No freelancer assigned'}
                          </span>
                        )}
                        <span>Posted: {formatDate(job.createdAt)}</span>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {isOpen && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => toggleJobApplications(job.id)}
                            >
                              {expandedJobId === job.id ? '▲ Hide Proposals' : `▼ Review Proposals (${jobApps.length})`}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEditJob(job)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <IconEdit size={13} /> Edit Post
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenCancelJob(job)}
                              style={{ color: 'var(--clr-error)', borderColor: 'rgba(239,68,68,0.3)' }}
                            >
                              <IconTrash size={13} /> Cancel
                            </button>
                          </>
                        )}

                        {isAssigned && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditJob(job)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <IconEdit size={13} /> Edit Scope
                          </button>
                        )}
                      </div>
                    </div>

                    {/* OPEN JOB: Expandable Candidate Applications Drawer */}
                    {isOpen && expandedJobId === job.id && (
                      <div style={{ marginTop: '1rem', background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-md)', padding: '1rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--clr-text)' }}>
                          Candidate Proposals for "{job.title}" ({jobApps.length})
                        </h4>

                        {jobApps.length === 0 ? (
                          <p style={{ fontSize: '0.825rem', color: 'var(--clr-text-3)', margin: 0 }}>
                            No candidate proposals received yet. Freelancers browsing the marketplace will appear here.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {jobApps.map(app => (
                              <div key={app.id} style={{ background: 'var(--clr-surface-1)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-sm)', padding: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div>
                                    <strong style={{ color: 'var(--clr-primary)', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => navigate(`/user/${app.freelancerUsername}`)}>
                                      @{app.freelancerUsername}
                                    </strong>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)', marginLeft: '6px' }}>
                                      ({app.freelancerFullName || 'Freelancer'})
                                    </span>
                                    <p style={{ fontSize: '0.825rem', color: 'var(--clr-text-2)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                                      "{app.proposalNotes}"
                                    </p>
                                  </div>

                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--clr-success)' }}>
                                      ${Number(app.bidAmount).toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>
                                      Est. {app.estimatedDays} day{app.estimatedDays > 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--clr-border)' }}>
                                  <span className={`badge ${app.status === 'PENDING' ? 'badge-open' : app.status === 'ACCEPTED' ? 'badge-completed' : 'badge-expired'}`} style={{ fontSize: '0.7rem' }}>
                                    {app.status}
                                  </span>

                                  {app.status === 'PENDING' && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ color: 'var(--clr-error)', fontSize: '0.75rem', padding: '4px 10px' }}
                                        onClick={() => handleRejectApp(job.id, app.id)}
                                      >
                                        Decline
                                      </button>
                                      <button
                                        className="btn btn-success btn-sm"
                                        style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                        onClick={() => handleAcceptApp(job.id, app.id)}
                                      >
                                        ✓ Accept & Assign Freelancer
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Deliverables Section if Freelancer submitted (DONE) */}
                    {assignment && assignment.status === 'DONE' && (
                      <div style={{ background: 'var(--clr-surface-2)', padding: '1rem', borderRadius: 'var(--r-md)', marginTop: '0.75rem', border: '1px solid var(--clr-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--clr-accent)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <IconFileCheck size={16} /> Deliverables Submitted
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>
                            Submitted on {formatDate(assignment.submittedAt)}
                          </span>
                        </div>

                        {assignment.submissionUrl && (
                          <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--clr-text-3)' }}>Deliverable URL: </span>
                            <a
                              href={assignment.submissionUrl.startsWith('http') ? assignment.submissionUrl : `https://${assignment.submissionUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--clr-primary)', fontWeight: 600, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              {assignment.submissionUrl} <IconExternalLink size={12} />
                            </a>
                          </div>
                        )}

                        {assignment.submissionNotes && (
                          <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', background: 'var(--clr-surface)', padding: '0.75rem', borderRadius: 'var(--r-sm)', marginBottom: '0.75rem' }}>
                            {assignment.submissionNotes}
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => handleOpenRevisionModal(assignment)}
                          >
                            Request Revisions
                          </button>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleOpenPayModal(assignment)}
                          >
                            Release Payment & Rate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── FREELANCER VIEW: Applications & Assigned Gigs ── */}
      {isFreelancer && (
        <div>
          {/* Submitted Applications Section */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconSend size={18} style={{ color: 'var(--clr-primary)' }} />
              My Submitted Proposals & Applications ({myApplications.length})
            </h2>

            {myApplications.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem', marginBottom: '2rem' }}>
                <p style={{ margin: 0, color: 'var(--clr-text-3)', fontSize: '0.85rem' }}>You haven't submitted any proposals yet. Browse jobs to submit bids.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {myApplications.map(app => (
                  <div key={app.id} className="assignment-card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.35rem' }}>
                          <span className={`badge ${app.status === 'PENDING' ? 'badge-open' : app.status === 'ACCEPTED' ? 'badge-completed' : 'badge-expired'}`}>
                            {app.status}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>Applied {formatDate(app.appliedAt)}</span>
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{app.workRequestTitle}</h4>
                        <p style={{ fontSize: '0.825rem', color: 'var(--clr-text-2)', marginTop: '0.25rem' }}>
                          <strong>Your Proposal:</strong> "{app.proposalNotes}"
                        </p>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--clr-primary)' }}>
                          ${Number(app.bidAmount).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>
                          Est. Timeline: {app.estimatedDays} days
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Assigned Gigs */}
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconBriefcase size={18} style={{ color: 'var(--clr-primary)' }} />
            Active Assignments & Projects ({myAssignments.length})
          </h2>

          {/* Status Filter Chips */}
          <div className="filter-chips" style={{ marginBottom: '1.5rem' }}>
            {['ALL', 'ACCEPTED', 'DONE', 'REVISION_REQUESTED', 'COMPLETED'].map((f) => (
              <span
                key={f}
                className={`chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.replace('_', ' ')}
              </span>
            ))}
          </div>

          {loading ? (
            <div className="skeleton-card" style={{ height: 160 }} />
          ) : myAssignments.length === 0 ? (
            <div className="empty-state">
              <IconBriefcase size={48} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <h3>No active assignments yet</h3>
              <p>Explore the job board to find tasks that match your skills.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/jobs')}>
                Find Work
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {myAssignments
                .filter(a => filter === 'ALL' || a.status === filter)
                .map((a) => {
                  const req = a.workRequest || {};
                  const isModifiedRecently = isModifiedWithin5Min(req.lastModifiedAt);

                  return (
                    <div key={a.id} className="assignment-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1, minWidth: '260px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                            <span className={`badge ${badgeClass(a.status)}`}>{a.status.replace('_', ' ')}</span>
                            {req.category && <span className="category-badge">{req.category}</span>}
                            {isModifiedRecently && (
                              <span className="badge badge-revision" style={{ fontSize: '0.7rem' }} title="Client modified job scope within the last 5 minutes">
                                <IconAlertTriangle size={11} /> Scope Modified &lt;5m ago (0.1% Compensation Eligible)
                              </span>
                            )}
                          </div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{req.title}</h3>
                          <p style={{ fontSize: '0.875rem', color: 'var(--clr-text-2)', marginTop: '0.35rem' }}>
                            {req.description}
                          </p>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-primary)' }}>
                            ${Number(req.amount || 0).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginTop: '0.2rem' }}>
                            Deadline: {formatDate(req.deadline)}
                          </div>
                        </div>
                      </div>

                      {/* Client Info & Accepted Date */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--clr-border)', marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-2)' }}>
                          Client: <strong style={{ color: 'var(--clr-primary)', cursor: 'pointer' }} onClick={() => navigate(`/user/${req.client?.username}`)}>
                            @{req.client?.username}
                          </strong>
                          <span style={{ margin: '0 0.5rem' }}>•</span>
                          Accepted: {formatDate(a.acceptedAt)}
                        </div>

                        {/* Freelancer Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {(a.status === 'ACCEPTED' || a.status === 'IN_PROGRESS' || a.status === 'REVISION_REQUESTED') && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOpenSubmitModal(a)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <IconFileCheck size={14} /> Submit Deliverables
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleOpenCancelModal(a)}
                                style={{ color: 'var(--clr-error)', borderColor: 'rgba(239,68,68,0.3)' }}
                              >
                                Cancel Assignment
                              </button>
                            </>
                          )}

                          {a.status === 'DONE' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--clr-accent)', fontWeight: 600 }}>
                              ✓ Deliverables Submitted — Awaiting Client Approval
                            </span>
                          )}

                          {a.status === 'COMPLETED' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--clr-success)', fontWeight: 600 }}>
                              ★ Payment Settled & Completed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Revision Feedback alert */}
                      {a.status === 'REVISION_REQUESTED' && a.feedback && (
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--r-md)', padding: '0.75rem 1rem', marginTop: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--clr-warning)', fontWeight: 700, fontSize: '0.85rem' }}>
                            <IconAlert size={14} /> Client Requested Changes (Revision #{a.revisionCount || 1}):
                          </div>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--clr-text-2)' }}>
                            {a.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* 1. FREELANCER: Submit Deliverable Modal */}
      {submitModalAssignment && (
        <div className="modal-overlay" onClick={() => setSubmitModalAssignment(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit Work Deliverables</h3>
              <button className="modal-close-btn" onClick={() => setSubmitModalAssignment(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitDeliverable}>
              <div className="form-group">
                <label className="form-label">Deliverable URL *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://github.com/user/project or Figma / Demo link"
                  value={submitForm.url}
                  onChange={e => setSubmitForm(f => ({ ...f, url: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Submission Notes & Instructions *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Describe your solution, test coverage, and deployment instructions…"
                  value={submitForm.notes}
                  onChange={e => setSubmitForm(f => ({ ...f, notes: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setSubmitModalAssignment(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? <><span className="spinner" /> Submitting…</> : 'Submit Deliverable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. FREELANCER: Cancellation Modal */}
      {cancelModalAssignment && (
        <div className="modal-overlay" onClick={() => setCancelModalAssignment(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cancel Assignment</h3>
              <button className="modal-close-btn" onClick={() => setCancelModalAssignment(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handleFreelancerCancel}>
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '1rem' }}>
                Are you sure you want to cancel your assignment for "<strong>{cancelModalAssignment.workRequest?.title}</strong>"?
              </p>

              <div className="form-group">
                <label className="form-label">Reason for Cancellation *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Explain why you cannot complete this assignment…"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setCancelModalAssignment(null)}>
                  Back
                </button>
                <button type="submit" className="btn btn-danger" disabled={cancelLoading || !cancelReason.trim()}>
                  {cancelLoading ? <><span className="spinner" /> Cancelling…</> : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. CLIENT: Edit Post Modal */}
      {editJobModal && (
        <div className="modal-overlay" onClick={() => setEditJobModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editJobModal.status === 'ASSIGNED' ? 'Modify Job Scope' : 'Edit Job Post'}</h3>
              <button className="modal-close-btn" onClick={() => setEditJobModal(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditJob}>
              <div className="form-group">
                <label className="form-label">Job Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Budget ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className="form-input"
                    value={editForm.amount}
                    onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editForm.deadline}
                    onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditJobModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? <><span className="spinner" /> Saving…</> : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CLIENT: Cancel Post Modal */}
      {cancelJobModal && (
        <div className="modal-overlay" onClick={() => setCancelJobModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cancel Job Post</h3>
              <button className="modal-close-btn" onClick={() => setCancelJobModal(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '1.25rem' }}>
              Are you sure you want to cancel the job post "<strong>{cancelJobModal.title}</strong>"? Your deposited escrow funds of <strong>${Number(cancelJobModal.amount).toFixed(2)}</strong> will be returned to your wallet.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setCancelJobModal(null)}>
                Keep Post
              </button>
              <button type="button" className="btn btn-danger" onClick={handleConfirmCancelJob} disabled={cancelJobLoading}>
                {cancelJobLoading ? <><span className="spinner" /> Cancelling…</> : 'Confirm Cancel & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CLIENT: Revision Modal */}
      {revisionModalAssignment && (
        <div className="modal-overlay" onClick={() => setRevisionModalAssignment(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Revisions</h3>
              <button className="modal-close-btn" onClick={() => setRevisionModalAssignment(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitRevision}>
              <div className="form-group">
                <label className="form-label">Revision Instructions *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Detail the changes required before releasing escrow payment…"
                  value={revisionFeedback}
                  onChange={e => setRevisionFeedback(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setRevisionModalAssignment(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning" disabled={revisionLoading || !revisionFeedback.trim()}>
                  {revisionLoading ? <><span className="spinner" /> Sending…</> : 'Send Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. CLIENT: Pay & Review Modal */}
      {payModalAssignment && (
        <div className="modal-overlay" onClick={() => setPayModalAssignment(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Release Payment & Rate</h3>
              <button className="modal-close-btn" onClick={() => setPayModalAssignment(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handlePay}>
              <div style={{ background: 'var(--clr-surface-2)', padding: '1rem', borderRadius: 'var(--r-md)', marginBottom: '1.25rem', border: '1px solid var(--clr-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span>Total Job Budget:</span>
                  <strong>${Number(payModalAssignment.workRequest?.amount || 0).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--clr-text-3)', marginBottom: '0.35rem' }}>
                  <span>Admin Platform Commission (0.1%):</span>
                  <span>-${(Number(payModalAssignment.workRequest?.amount || 0) * 0.001).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--clr-primary)', fontWeight: 700, borderTop: '1px solid var(--clr-border)', paddingTop: '0.35rem' }}>
                  <span>Net Freelancer Payout:</span>
                  <span>${(Number(payModalAssignment.workRequest?.amount || 0) * 0.999).toFixed(2)}</span>
                </div>
              </div>

              <div className="form-group" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Rate the Freelancer</label>
                <StarRating rating={payForm.rating} onChange={r => setPayForm(f => ({ ...f, rating: r }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Review & Feedback (Optional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Share your experience working with this freelancer…"
                  value={payForm.review}
                  onChange={e => setPayForm(f => ({ ...f, review: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setPayModalAssignment(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={payLoading}>
                  {payLoading ? <><span className="spinner" /> Processing…</> : `Confirm Release ($${Number(payModalAssignment.workRequest?.amount || 0).toFixed(2)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CLIENT: Moderation Appeal Modal */}
      {appealModalJob && (
        <div className="modal-overlay" onClick={() => setAppealModalJob(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit Moderation Appeal</h3>
              <button className="modal-close-btn" onClick={() => setAppealModalJob(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitAppeal}>
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '1rem' }}>
                If you believe your job post "<strong>{appealModalJob.title}</strong>" was flagged in error, please provide an explanation below. An administrator will review your appeal.
              </p>

              <div className="form-group">
                <label className="form-label">Flagged Reason</label>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--r-md)', fontSize: '0.8rem', color: 'var(--clr-error)', marginBottom: '1rem' }}>
                  {appealModalJob.moderationReason || 'Policy check violation.'}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Appeal Explanation *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Explain why this post complies with MicroGig platform policies…"
                  value={appealNotes}
                  onChange={e => setAppealNotes(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setAppealModalJob(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={appealLoading || !appealNotes.trim()}>
                  {appealLoading ? <><span className="spinner" /> Submitting…</> : 'Submit Appeal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAssignments;
