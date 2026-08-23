import React, { useState, useEffect } from 'react';
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

// Helper to render interactive or read-only star ratings
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
  const [clientJobs, setClientJobs] = useState([]);
  const [clientAssignments, setClientAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  // ── Modal States ──
  // 1. Deliverable Submission Pipeline (Freelancer)
  const [submitModalAssignment, setSubmitModalAssignment] = useState(null);
  const [submitStep, setSubmitStep] = useState(1); // 1 = Form, 2 = Preview
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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isFreelancer) {
        const res = await api.get('/assignments/my');
        setMyAssignments(res.data || []);
      }
      if (isClient) {
        const [jobsRes, assignRes] = await Promise.all([
          api.get('/work/my'),
          api.get('/assignments/client')
        ]);
        setClientJobs(jobsRes.data || []);
        setClientAssignments(assignRes.data || []);
      }
    } catch {
      toast.error('Failed to load project data.');
    } finally {
      setLoading(false);
    }
  };

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
      toast.error('Please provide a submission URL (e.g. GitHub repo, Figma link, Live demo).');
      return;
    }
    if (!submitForm.notes.trim()) {
      toast.error('Please provide notes describing your deliverables.');
      return;
    }

    setSubmitLoading(true);
    try {
      await api.post(`/assignments/${submitModalAssignment.workRequest.id}/submit`, {
        submissionNotes: submitForm.notes.trim(),
        submissionUrl: submitForm.url.trim(),
      });
      toast.success('Deliverables submitted successfully! The client has been notified to review.');
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
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      toast.error('Please provide a valid cancellation reason (minimum 5 characters).');
      return;
    }

    setCancelLoading(true);
    try {
      const res = await api.post(`/assignments/${cancelModalAssignment.workRequest.id}/cancel`, {
        reason: cancelReason.trim(),
      });

      if (res.data?.compensated) {
        toast.success(`Assignment cancelled. You received $${Number(res.data.compensationAmount).toFixed(2)} (0.1%) compensation!`);
      } else {
        toast.success('Assignment cancelled successfully.');
      }

      setCancelModalAssignment(null);
      fetchData();
      refreshUserData();
    } catch (err) {
      const msg = err.response?.data || 'Failed to cancel assignment.';
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
      category: job.category || 'Web Development',
      skills: job.skills || '',
      amount: job.amount || '',
      deadline: job.deadline ? job.deadline.slice(0, 16) : '',
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

  // Helper to check if a job was modified within 5 minutes
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
            {isClient ? 'My Job Posts & Assignments' : 'My Work & Assignments'}
          </h1>
          <p style={{ color: 'var(--clr-text-2)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {isClient
              ? 'Manage your posted gigs, review submissions, request revisions, and release payouts.'
              : 'Track accepted gigs, submit deliverables, and communicate with clients.'
            }
          </p>
        </div>

        {isClient && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/post-job')}>
            <IconPlus size={14} /> Post a New Job
          </button>
        )}
      </div>

      {/* ── CLIENT VIEW: Posted Jobs Management ── */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
              {clientJobs.map((job) => {
                const isAssigned = job.status === 'ASSIGNED';
                const isOpen = job.status === 'OPEN';
                const isFlagged = job.status === 'FLAGGED';
                const isSuspended = job.status === 'SUSPENDED';
                const isDone = job.status === 'COMPLETED';
                const isCancelled = job.status === 'CANCELLED';

                // Find corresponding assignment if any
                const assignment = clientAssignments.find(a => a.workRequest?.id === job.id);

                return (
                  <div key={job.id} className="assignment-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                          <span className={`badge ${badgeClass(job.status)}`}>{job.status}</span>
                          {job.category && <span className="category-badge">{job.category}</span>}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--clr-border)' }}>
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
                            {isOpen ? 'Awaiting freelancer acceptance' : isCancelled ? 'Post cancelled' : 'No freelancer assigned'}
                          </span>
                        )}
                        <span>Posted: {formatDate(job.createdAt)}</span>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {/* OPEN: Edit or Cancel */}
                        {isOpen && (
                          <>
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
                              <IconTrash size={13} /> Cancel Post
                            </button>
                          </>
                        )}

                        {/* ASSIGNED: Modify Scope */}
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

                        {/* Client Actions: Revision vs Pay */}
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

      {/* ── FREELANCER VIEW: Assigned Gigs ── */}
      {isFreelancer && (
        <div>
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
              <h3>No assignments yet</h3>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--clr-border)' }}>
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
                            <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)', fontStyle: 'italic' }}>
                              Deliverables submitted • Awaiting client payment release
                            </span>
                          )}

                          {a.status === 'COMPLETED' && a.rating && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <StarRating rating={a.rating} readOnly />
                              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>({a.rating}/5)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Revision Feedback alert if requested */}
                      {a.status === 'REVISION_REQUESTED' && a.feedback && (
                        <div style={{ background: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.3)', padding: '0.85rem', borderRadius: 'var(--r-md)', marginTop: '0.5rem' }}>
                          <strong style={{ color: 'var(--clr-warning)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <IconAlert size={14} /> Client Requested Changes (Revision #{a.revisionCount || 1}):
                          </strong>
                          <p style={{ fontSize: '0.85rem', color: 'var(--clr-text)', marginTop: '0.25rem' }}>
                            {a.feedback}
                          </p>
                        </div>
                      )}

                      {/* Cancellation Reason alert if cancelled */}
                      {a.status === 'CANCELLED_BY_FREELANCER' && a.cancellationReason && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem', borderRadius: 'var(--r-md)', marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--clr-error)', fontWeight: 600 }}>
                            Cancellation Reason:
                          </span>
                          <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginTop: '0.2rem' }}>
                            {a.cancellationReason}
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

      {/* =========================================================================
          MODALS
          ========================================================================= */}

      {/* 1. FREELANCER: Deliverable Submission Pipeline Modal */}
      {submitModalAssignment && (
        <div className="modal-overlay" onClick={() => setSubmitModalAssignment(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Submit Work Deliverables</h3>
              <button className="modal-close-btn" onClick={() => setSubmitModalAssignment(null)}>
                <IconClose size={16} />
              </button>
            </div>

            {submitStep === 1 ? (
              <form onSubmit={(e) => { e.preventDefault(); setSubmitStep(2); }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '1.25rem' }}>
                  Provide your completed work URL, codebase link, or live project along with implementation notes.
                </p>

                <div className="form-group">
                  <label className="form-label">Deliverable URL (GitHub / Demo / Drive) *</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://github.com/... or https://mydemo.app"
                    value={submitForm.url}
                    onChange={e => setSubmitForm(f => ({ ...f, url: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Submission Notes & Completion Details *</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Describe what has been implemented, how to run/test the project, and any special instructions…"
                    value={submitForm.notes}
                    onChange={e => setSubmitForm(f => ({ ...f, notes: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ background: 'var(--clr-surface-2)', padding: '1rem', borderRadius: 'var(--r-md)', marginBottom: '1.25rem', border: '1px solid var(--clr-border)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--clr-text-2)', marginBottom: '0.5rem' }}>
                    Deliverable Verification Checklist
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checklist.requirementsMet}
                      onChange={e => setChecklist(c => ({ ...c, requirementsMet: e.target.checked }))}
                    />
                    All job requirements and specifications are met
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checklist.testsPass}
                      onChange={e => setChecklist(c => ({ ...c, testsPass: e.target.checked }))}
                    />
                    Code builds without errors and tested
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checklist.cleanCode}
                      onChange={e => setChecklist(c => ({ ...c, cleanCode: e.target.checked }))}
                    />
                    Clear documentation & comments included
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setSubmitModalAssignment(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={!submitForm.url || !submitForm.notes}>
                    Review & Preview →
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ background: 'var(--clr-surface-2)', padding: '1.25rem', borderRadius: 'var(--r-md)', marginBottom: '1.5rem', border: '1px solid var(--clr-border)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--clr-primary)' }}>
                    Submission Preview for: {submitModalAssignment.workRequest?.title}
                  </h4>
                  <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <strong>Deliverable Link: </strong>
                    <a href={submitForm.url} target="_blank" rel="noreferrer" style={{ color: 'var(--clr-primary)', textDecoration: 'underline' }}>
                      {submitForm.url}
                    </a>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', whiteSpace: 'pre-wrap' }}>
                    <strong>Notes:</strong>
                    <p style={{ marginTop: '0.25rem' }}>{submitForm.notes}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSubmitStep(1)}>
                    ← Back to Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={submitLoading}
                    onClick={handleSubmitDeliverable}
                  >
                    {submitLoading ? <><span className="spinner" /> Submitting…</> : 'Confirm Final Submission'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. FREELANCER: Cancellation with Compensation Modal */}
      {cancelModalAssignment && (
        <div className="modal-overlay" onClick={() => setCancelModalAssignment(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--clr-error)' }}>Cancel Assignment</h3>
              <button className="modal-close-btn" onClick={() => setCancelModalAssignment(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handleFreelancerCancel}>
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '1rem' }}>
                Are you sure you want to cancel your assignment for <strong>"{cancelModalAssignment.workRequest?.title}"</strong>?
              </p>

              {/* Notice if modified within 5 minutes */}
              {isModifiedWithin5Min(cancelModalAssignment.workRequest?.lastModifiedAt) ? (
                <div style={{ background: 'rgba(82, 183, 136, 0.12)', border: '1px solid rgba(82, 183, 136, 0.35)', padding: '0.85rem', borderRadius: 'var(--r-md)', marginBottom: '1rem' }}>
                  <strong style={{ color: 'var(--clr-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <IconCheck size={15} /> 0.1% Compensation Qualified!
                  </strong>
                  <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-2)', marginTop: '0.25rem' }}>
                    Because the client modified this post within the last 5 minutes, you will receive <strong>${(Number(cancelModalAssignment.workRequest?.amount || 0) * 0.001).toFixed(2)}</strong> (0.1% of budget) credited directly to your wallet upon cancellation.
                  </p>
                </div>
              ) : (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem', borderRadius: 'var(--r-md)', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--clr-text-2)' }}>
                  Please provide a valid cancellation reason. The job will be reopened for other freelancers.
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Cancellation Reason *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Explain why you are unable to complete or continue this gig…"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setCancelModalAssignment(null)}>
                  Keep Assignment
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'var(--clr-error)', color: '#fff' }}
                  disabled={cancelLoading || cancelReason.trim().length < 5}
                >
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
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Edit Job Details</h3>
              <button className="modal-close-btn" onClick={() => setEditJobModal(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditJob}>
              {editJobModal.status === 'ASSIGNED' && (
                <div style={{ background: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.3)', padding: '0.75rem', borderRadius: 'var(--r-md)', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--clr-text-2)' }}>
                  <strong style={{ color: 'var(--clr-warning)' }}>Notice:</strong> This job is already assigned to a freelancer. Modifying scope/details will notify the freelancer and allow them a 5-minute cancellation window with 0.1% compensation.
                </div>
              )}

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
                  <label className="form-label">Budget ($ USD) *</label>
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
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={editForm.category}
                    onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile Apps">Mobile Apps</option>
                    <option value="UI/UX & Graphic Design">UI/UX & Graphic Design</option>
                    <option value="Bug Fixes & DevOps">Bug Fixes & DevOps</option>
                    <option value="Data Science & AI">Data Science & AI</option>
                    <option value="Writing & Translation">Writing & Translation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="React, Spring Boot, Postgres..."
                  value={editForm.skills}
                  onChange={e => setEditForm(f => ({ ...f, skills: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditJobModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CLIENT: Cancel Post Confirmation Modal */}
      {cancelJobModal && (
        <div className="modal-overlay" onClick={() => setCancelJobModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--clr-error)' }}>Cancel Job Post</h3>
              <button className="modal-close-btn" onClick={() => setCancelJobModal(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--clr-text-2)', marginBottom: '1.5rem' }}>
              Are you sure you want to cancel the job post <strong>"{cancelJobModal.title}"</strong>? It will no longer be visible on the public job board.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setCancelJobModal(null)}>
                Keep Post
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--clr-error)', color: '#fff' }}
                disabled={cancelJobLoading}
                onClick={handleConfirmCancelJob}
              >
                {cancelJobLoading ? <><span className="spinner" /> Cancelling…</> : 'Yes, Cancel Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CLIENT: Request Revision Modal */}
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
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '1rem' }}>
                Please provide clear instructions for the freelancer on what adjustments or corrections are needed.
              </p>

              <div className="form-group">
                <label className="form-label">Revision Feedback *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Detail the specific changes required before approving payment…"
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
                  {revisionLoading ? <><span className="spinner" /> Sending…</> : 'Submit Revision Request'}
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
              <h3>Release Payment & Review</h3>
              <button className="modal-close-btn" onClick={() => setPayModalAssignment(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handlePay}>
              {/* Payment Summary */}
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
