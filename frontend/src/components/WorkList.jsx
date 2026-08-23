import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from './Toast';
import {
  IconSearch,
  IconCalendar,
  IconClock,
  IconUser,
  IconRefresh,
  IconEdit,
  IconCheck,
  IconClose,
  IconSend
} from './Icons';

const STATUS_FILTERS = ['ALL', 'OPEN', 'ASSIGNED', 'COMPLETED'];
const CATEGORY_FILTERS = [
  'ALL',
  'Web Development',
  'Mobile Apps',
  'UI/UX & Graphic Design',
  'Bug Fixes & DevOps',
  'Data Science & AI',
  'Writing & Translation',
];

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
      <div className="skeleton" style={{ height: 20, width: '60%' }} />
      <div className="skeleton" style={{ height: 28, width: 80, borderRadius: 'var(--r-full)' }} />
    </div>
    <div className="skeleton" style={{ height: 14, width: '100%' }} />
    <div className="skeleton" style={{ height: 14, width: '80%' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
      <div className="skeleton" style={{ height: 22, width: 80, borderRadius: 'var(--r-full)' }} />
      <div className="skeleton" style={{ height: 34, width: 100, borderRadius: 'var(--r-md)' }} />
    </div>
  </div>
);

const WorkList = ({ user }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const isFreelancer = user?.role === 'ROLE_FREELANCER';
  const isClient = user?.role === 'ROLE_CLIENT';

  const [works, setWorks] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [liveStatsMap, setLiveStatsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  // Proposal / Apply Modal State
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [proposalForm, setProposalForm] = useState({
    bidAmount: '',
    estimatedDays: 3,
    proposalNotes: ''
  });
  const [submittingProposal, setSubmittingProposal] = useState(false);

  const loadWorks = useCallback(async () => {
    setLoading(true);
    try {
      const [worksRes, appsRes] = await Promise.all([
        api.get('/work'),
        isFreelancer ? api.get('/applications/my').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);
      setWorks(worksRes.data || []);
      setMyApplications(appsRes.data || []);
    } catch {
      toast.error('Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isFreelancer]);

  useEffect(() => {
    loadWorks();
  }, [loadWorks]);

  // Fetch live viewer stats for open works
  useEffect(() => {
    if (works.length === 0) return;

    const fetchLiveStats = async () => {
      const openWorks = works.filter(w => w.status === 'OPEN').slice(0, 8);
      const updates = {};
      await Promise.all(
        openWorks.map(async (w) => {
          try {
            const res = await api.get(`/work/${w.id}/live-stats`);
            if (res.data) {
              updates[w.id] = res.data;
            }
          } catch { /* ignore */ }
        })
      );
      setLiveStatsMap(prev => ({ ...prev, ...updates }));
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 20000);
    return () => clearInterval(interval);
  }, [works]);

  const openApplyModal = (job) => {
    setApplyModalJob(job);
    setProposalForm({
      bidAmount: job.amount,
      estimatedDays: 3,
      proposalNotes: ''
    });
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyModalJob) return;

    setSubmittingProposal(true);
    try {
      const res = await api.post(`/work/${applyModalJob.id}/apply`, {
        proposalNotes: proposalForm.proposalNotes.trim(),
        bidAmount: Number(proposalForm.bidAmount),
        estimatedDays: Number(proposalForm.estimatedDays)
      });

      toast.success(`Proposal submitted for "${applyModalJob.title}"! The client has been notified.`);
      setMyApplications(prev => [res.data, ...prev]);
      setApplyModalJob(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to submit proposal.';
      toast.error(typeof msg === 'string' ? msg : 'Failed to submit proposal.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const hasApplied = (workId) => {
    return myApplications.some(app => app.workRequestId === workId && app.status === 'PENDING');
  };

  const filtered = works
    .filter(w => {
      const matchStatus = statusFilter === 'ALL' || w.status === statusFilter;
      const matchCategory = categoryFilter === 'ALL' || w.category === categoryFilter;
      const query = search.toLowerCase();
      const matchSearch =
        !search ||
        w.title?.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query) ||
        w.category?.toLowerCase().includes(query) ||
        w.skills?.toLowerCase().includes(query);
      return matchStatus && matchCategory && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'BUDGET_HIGH') return Number(b.amount) - Number(a.amount);
      if (sortBy === 'BUDGET_LOW') return Number(a.amount) - Number(b.amount);
      if (sortBy === 'DEADLINE') return new Date(a.deadline) - new Date(b.deadline);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusBadgeClass = (s) => {
    const map = {
      OPEN: 'badge-open',
      ASSIGNED: 'badge-assigned',
      COMPLETED: 'badge-completed',
      CANCELLED: 'badge-expired'
    };
    return map[s] || 'badge-open';
  };

  return (
    <div className="page-content" style={{ animation: 'fadeSlideUp 0.3s ease' }}>
      {/* Header */}
      <div className="jobs-page-header">
        <div>
          <h1>{isFreelancer ? 'Find Work & Submit Proposals' : 'Browse Marketplace Gigs'}</h1>
          <p>{filtered.length} job{filtered.length !== 1 ? 's' : ''} available</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            id="btn-refresh-jobs"
            className="btn btn-ghost btn-sm"
            onClick={loadWorks}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : <IconRefresh size={14} />} Refresh
          </button>
          {isClient && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/post-job')}
            >
              + Post a Job
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="jobs-controls">
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="search-box">
            <span className="search-icon">
              <IconSearch size={15} />
            </span>
            <input
              id="jobs-search"
              type="text"
              placeholder="Search by title, description, skills, or category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-input"
            style={{ width: 'auto', minWidth: '180px', padding: '0.65rem 1rem' }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="NEWEST">Newest First</option>
            <option value="BUDGET_HIGH">Budget: High to Low</option>
            <option value="BUDGET_LOW">Budget: Low to High</option>
            <option value="DEADLINE">Nearest Deadline</option>
          </select>
        </div>

        {/* Status and Category Filter Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Status Chips */}
          <div className="filter-chips">
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--clr-text-3)', marginRight: '0.25rem' }}>Status:</span>
            {STATUS_FILTERS.map(f => (
              <span
                key={f}
                className={`chip ${statusFilter === f ? 'active' : ''}`}
                onClick={() => setStatusFilter(f)}
              >
                {f}
              </span>
            ))}
          </div>

          {/* Category Chips */}
          <div className="filter-chips" style={{ overflowX: 'auto', maxWidth: '100%' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--clr-text-3)', marginRight: '0.25rem' }}>Category:</span>
            {CATEGORY_FILTERS.map(cat => (
              <span
                key={cat}
                className={`chip ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="jobs-grid">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconSearch size={48} />
          </div>
          <h3>No jobs found</h3>
          <p>
            {search || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No jobs match your selected filters. Try clearing your search.'
              : 'There are no open jobs right now. Check back soon.'}
          </p>
          {(search || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setCategoryFilter('ALL'); setStatusFilter('OPEN'); }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="jobs-grid">
          {filtered.map(w => {
            const skillsList = w.skills ? w.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
            const isMyPost = user && w.client?.id === user.id;
            const applied = hasApplied(w.id);
            const liveStats = liveStatsMap[w.id];

            return (
              <div key={w.id} className="job-card" style={isMyPost ? { border: '1px solid var(--clr-primary)' } : {}}>
                <div className="job-card-header">
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {w.category && (
                        <span className="category-badge">{w.category}</span>
                      )}
                      {isMyPost && (
                        <span className="badge badge-assigned" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                          Your Post
                        </span>
                      )}
                      {/* Redis Live Viewers Badge */}
                      {liveStats && liveStats.activeViewers > 0 && (
                        <span style={{ fontSize: '0.68rem', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--clr-error)', padding: '2px 7px', borderRadius: 'var(--r-full)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          🔥 {liveStats.activeViewers} viewing now
                        </span>
                      )}
                    </div>
                    <h3 className="job-card-title" style={{ marginTop: '0.35rem' }}>{w.title}</h3>
                  </div>
                  <span className="job-amount">${Number(w.amount).toFixed(2)}</span>
                </div>

                <p className="job-description">{w.description}</p>

                {skillsList.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.5rem 0' }}>
                    {skillsList.map((skill, idx) => (
                      <span key={idx} className="skill-chip">{skill}</span>
                    ))}
                  </div>
                )}

                <div className="job-card-meta">
                  <span
                    className="job-meta-item"
                    style={{ cursor: w.client?.username ? 'pointer' : 'default' }}
                    onClick={(e) => {
                      if (w.client?.username) {
                        e.stopPropagation();
                        navigate(`/user/${w.client.username}`);
                      }
                    }}
                    title="View client public profile"
                  >
                    <IconUser size={13} />
                    <span style={{ textDecoration: 'underline', textUnderlineOffset: '2px', color: 'var(--clr-primary)' }}>
                      {isMyPost ? 'You (Client)' : (w.client?.fullName ? `${w.client.fullName} (@${w.client.username})` : (w.client?.username || 'Client'))}
                    </span>
                  </span>
                  <span className="job-meta-item">
                    <IconCalendar size={13} />
                    <span>Due {formatDate(w.deadline)}</span>
                  </span>
                  <span className="job-meta-item">
                    <IconClock size={13} />
                    <span>Posted {formatDate(w.createdAt)}</span>
                  </span>
                </div>

                <div className="job-card-footer">
                  <span className={`badge ${statusBadgeClass(w.status)}`}>
                    {w.status}
                  </span>

                  {isFreelancer && w.status === 'OPEN' && (
                    applied ? (
                      <span className="badge badge-assigned" style={{ fontSize: '0.8rem', padding: '6px 12px', fontWeight: 700 }}>
                        ✓ Applied (Pending)
                      </span>
                    ) : (
                      <button
                        id={`btn-apply-${w.id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => openApplyModal(w)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <IconSend size={13} /> Apply with Proposal
                      </button>
                    )
                  )}

                  {isMyPost && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate('/my-assignments')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <IconEdit size={13} /> Review Proposals
                    </button>
                  )}

                  {!isFreelancer && !isMyPost && w.status === 'OPEN' && (
                    <span style={{ fontSize: '0.775rem', color: 'var(--clr-text-3)' }}>
                      Accepting proposals
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Freelancer Proposal / Application Modal */}
      {applyModalJob && (
        <div className="modal-overlay" onClick={() => setApplyModalJob(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Apply for: {applyModalJob.title}</h3>
              <button className="modal-close-btn" onClick={() => setApplyModalJob(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit}>
              <div style={{ background: 'var(--clr-surface-2)', padding: '0.85rem 1rem', borderRadius: 'var(--r-md)', marginBottom: '1.25rem', border: '1px solid var(--clr-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span>Client Budget:</span>
                  <strong>${Number(applyModalJob.amount).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--clr-text-3)' }}>
                  <span>Client Deadline:</span>
                  <span>{formatDate(applyModalJob.deadline)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Your Bid Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.00"
                    className="form-input"
                    value={proposalForm.bidAmount}
                    onChange={e => setProposalForm(p => ({ ...p, bidAmount: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Estimated Days to Deliver *</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="form-input"
                    value={proposalForm.estimatedDays}
                    onChange={e => setProposalForm(p => ({ ...p, estimatedDays: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Proposal Cover Message *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Explain why you are the best fit for this gig, your approach, and relevant experience…"
                  value={proposalForm.proposalNotes}
                  onChange={e => setProposalForm(p => ({ ...p, proposalNotes: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setApplyModalJob(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingProposal || !proposalForm.proposalNotes.trim() || !proposalForm.bidAmount}
                >
                  {submittingProposal ? <><span className="spinner" /> Submitting…</> : 'Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkList;
