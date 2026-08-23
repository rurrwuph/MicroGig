import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from './Toast';
import {
  IconWallet,
  IconBriefcase,
  IconClock,
  IconCheck,
  IconSearch,
  IconPlus,
  IconStar,
  IconUser,
  IconAlert,
  IconClose
} from './Icons';

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [flaggedJobs, setFlaggedJobs] = useState([]);
  const [modLoading, setModLoading] = useState(null);
  const [notesModalJob, setNotesModalJob] = useState(null);
  const [modAction, setModAction] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const isClient = user?.role === 'ROLE_CLIENT' || user?.role === 'CLIENT';
  const isFreelancer = user?.role === 'ROLE_FREELANCER' || user?.role === 'FREELANCER' || (!isAdmin && !isClient);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [statsRes, flaggedRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/work-requests/flagged').catch(() => ({ data: [] }))
        ]);
        setAdminStats(statsRes.data);
        setFlaggedJobs(flaggedRes.data || []);
      } else if (isClient) {
        const res = await api.get('/work');
        const all = res.data || [];
        const myJobs = all.filter(w => w.client?.username === user?.username);
        const open     = myJobs.filter(w => w.status === 'OPEN').length;
        const assigned = myJobs.filter(w => w.status === 'ASSIGNED').length;
        const done     = myJobs.filter(w => w.status === 'COMPLETED').length;
        setStats({ total: myJobs.length, open, assigned, done });
      } else {
        const [workRes, assignRes] = await Promise.all([
          api.get('/work').catch(() => ({ data: [] })),
          api.get('/assignments/my').catch(() => ({ data: [] })),
        ]);
        const openJobs = (workRes.data || []).filter(w => w.status === 'OPEN').length;
        const myAssignments = assignRes.data || [];
        const active = myAssignments.filter(a => a.status === 'ACCEPTED' || a.status === 'IN_PROGRESS' || a.status === 'REVISION_REQUESTED').length;
        const completed = myAssignments.filter(a => a.status === 'COMPLETED').length;
        
        const ratedAssignments = myAssignments.filter(a => a.status === 'COMPLETED' && a.rating);
        const avgRating = ratedAssignments.length > 0
          ? (ratedAssignments.reduce((acc, curr) => acc + curr.rating, 0) / ratedAssignments.length).toFixed(1)
          : null;

        setStats({ openJobs, active, completed, avgRating, totalRated: ratedAssignments.length });
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setStats({});
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isClient, user?.username]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleModerate = async (jobId, action, notes = '') => {
    setModLoading(jobId);
    try {
      const res = await api.patch(`/admin/work-requests/${jobId}/moderate`, {
        action,
        adminNotes: notes
      });
      toast.success(`Post #${jobId} moderated successfully: ${action}`);
      setFlaggedJobs(prev => prev.filter(j => j.id !== jobId));
      fetchStats();
      setNotesModalJob(null);
      setAdminNotes('');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Moderation action failed.';
      toast.error(typeof msg === 'string' ? msg : 'Moderation action failed.');
    } finally {
      setModLoading(null);
    }
  };

  const openNotesModal = (job, action) => {
    setNotesModalJob(job);
    setModAction(action);
    setAdminNotes('');
  };

  const StatCard = ({ icon, label, value, color, onClick }) => (
    <div className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className={`stat-card-icon ${color}`}>{icon}</div>
      <div className="stat-card-value">{loading ? '—' : value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );

  return (
    <div className="page-content" style={{ animation: 'fadeSlideUp 0.3s ease' }}>
      {/* Header */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
          <h1>Dashboard</h1>
          <span className={`role-badge ${isAdmin ? 'admin' : isClient ? 'client' : 'freelancer'}`}>
            {isAdmin ? 'Administrator' : isClient ? 'Client' : 'Freelancer'}
          </span>
        </div>
        <p>Welcome back, <strong>{user?.fullName || user?.username}</strong>. Here is your platform overview.</p>
      </div>

      {/* Admin Stats */}
      {isAdmin && (
        <div className="stats-grid">
          <StatCard
            icon={<IconUser size={22} />} label="Total Users"
            value={adminStats?.totalUsers ?? 0} color="cyan"
          />
          <StatCard
            icon={<IconBriefcase size={22} />} label="Total Clients"
            value={adminStats?.totalClients ?? 0} color="purple"
          />
          <StatCard
            icon={<IconStar size={22} />} label="Total Freelancers"
            value={adminStats?.totalFreelancers ?? 0} color="green"
          />
          <StatCard
            icon={<IconCheck size={22} />} label="Total Jobs Posted"
            value={adminStats?.totalJobs ?? 0} color="amber"
            onClick={() => navigate('/jobs')}
          />
          <StatCard
            icon={<IconAlert size={22} />} label="Flagged for Moderation"
            value={adminStats?.flaggedJobs ?? flaggedJobs.length} color="amber"
          />
        </div>
      )}

      {/* Client Stats */}
      {isClient && (
        <div className="stats-grid">
          <StatCard
            icon={<IconWallet size={22} />} label="Wallet Balance"
            value={`$${Number(user?.balance ?? 0).toFixed(2)}`} color="green"
            onClick={() => navigate('/wallet')}
          />
          <StatCard
            icon={<IconBriefcase size={22} />} label="Total Posted Jobs"
            value={stats?.total ?? 0} color="purple"
            onClick={() => navigate('/my-assignments')}
          />
          <StatCard
            icon={<IconClock size={22} />} label="In Progress"
            value={stats?.assigned ?? 0} color="amber"
            onClick={() => navigate('/my-assignments')}
          />
          <StatCard
            icon={<IconCheck size={22} />} label="Completed Projects"
            value={stats?.done ?? 0} color="cyan"
            onClick={() => navigate('/my-assignments')}
          />
        </div>
      )}

      {/* Freelancer Stats */}
      {isFreelancer && (
        <div className="stats-grid">
          <StatCard
            icon={<IconSearch size={22} />} label="Open Jobs Available"
            value={stats?.openJobs ?? 0} color="cyan"
            onClick={() => navigate('/jobs')}
          />
          <StatCard
            icon={<IconClock size={22} />} label="Active Assignments"
            value={stats?.active ?? 0} color="amber"
            onClick={() => navigate('/my-assignments')}
          />
          <StatCard
            icon={<IconCheck size={22} />} label="Completed Gigs"
            value={stats?.completed ?? 0} color="purple"
            onClick={() => navigate('/my-assignments')}
          />
          <StatCard
            icon={<IconStar size={22} filled />} label={stats?.totalRated ? `Rating (${stats.totalRated} reviews)` : 'Rating'}
            value={stats?.avgRating ? `${stats.avgRating} / 5.0` : 'New'} color="green"
          />
        </div>
      )}

      {/* ADMIN: Prominent Moderation Queue */}
      {isAdmin && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-text)' }}>
                🛡️ Post Moderation & Appeal Queue
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginTop: '0.2rem' }}>
                Review intercepted job posts, inspect client appeal notes, and make moderation decisions.
              </p>
            </div>
            <span style={{ fontSize: '0.85rem', background: flaggedJobs.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: flaggedJobs.length > 0 ? 'var(--clr-error)' : 'var(--clr-success)', padding: '6px 12px', borderRadius: 'var(--r-sm)', fontWeight: 700 }}>
              {flaggedJobs.length} Flagged Post{flaggedJobs.length !== 1 ? 's' : ''} Pending
            </span>
          </div>

          {flaggedJobs.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem', background: 'var(--clr-surface-1)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>✅</div>
              <h4 style={{ color: 'var(--clr-text)', fontWeight: 700 }}>Moderation Queue Clear</h4>
              <p style={{ color: 'var(--clr-text-3)', fontSize: '0.85rem', margin: 0 }}>All job posts currently meet platform policy guidelines.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {flaggedJobs.map(job => {
                const isItemLoading = modLoading === job.id;

                return (
                  <div key={job.id} className="assignment-card" style={{ borderLeft: job.appealRequested ? '4px solid var(--clr-primary)' : '4px solid var(--clr-error)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                          <span className="badge badge-expired">FLAGGED</span>
                          {job.appealRequested && (
                            <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--clr-primary)', padding: '3px 9px', borderRadius: '4px', fontWeight: 800 }}>
                              ⚡ APPEAL PENDING
                            </span>
                          )}
                          <span className="category-badge">{job.category || 'General'}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)' }}>
                            Client: <strong>@{job.client?.username}</strong> ({job.client?.email})
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--clr-text)' }}>{job.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                          {job.description}
                        </p>

                        {/* Violation & Appeal Box */}
                        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--r-md)', marginTop: '0.65rem' }}>
                          <div style={{ fontSize: '0.82rem', color: 'var(--clr-error)', fontWeight: 600 }}>
                            <strong>Intercepted Policy Violation:</strong> {job.moderationReason || 'Policy pattern match triggered.'}
                          </div>
                          {job.appealNotes && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--clr-text-1)', borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: '0.45rem' }}>
                              <strong style={{ color: 'var(--clr-primary)' }}>Client Appeal Notes:</strong> "{job.appealNotes}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-primary)' }}>
                          ${Number(job.amount).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginTop: '0.2rem' }}>
                          Post ID: #{job.id}
                        </div>
                      </div>
                    </div>

                    {/* Moderation Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--clr-border)' }}>
                      <button
                        className="btn btn-success btn-sm"
                        disabled={isItemLoading}
                        onClick={() => handleModerate(job.id, 'APPROVE')}
                      >
                        ✓ Approve Post
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={isItemLoading}
                        onClick={() => openNotesModal(job, 'REQUEST_CHANGES')}
                      >
                        ✎ Request Changes
                      </button>
                      {job.appealRequested ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--clr-error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          disabled={isItemLoading}
                          onClick={() => openNotesModal(job, 'REJECT_APPEAL')}
                        >
                          ✕ Reject Appeal & Suspend
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--clr-error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          disabled={isItemLoading}
                          onClick={() => openNotesModal(job, 'SUSPEND')}
                        >
                          🛑 Suspend Post
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--clr-text-3)' }}
                        disabled={isItemLoading}
                        onClick={() => handleModerate(job.id, 'SOFT_DELETE')}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions" style={{ marginTop: '2rem' }}>
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid">
          {isAdmin && (
            <>
              <button id="qa-explore-jobs" className="btn btn-primary" onClick={() => navigate('/jobs')}>
                <IconSearch size={16} /> Explore All Marketplace Jobs
              </button>
              <button id="qa-admin-profile" className="btn btn-secondary" onClick={() => navigate('/profile')}>
                <IconUser size={16} /> Admin Account Settings
              </button>
            </>
          )}
          {isClient && (
            <>
              <button id="qa-post-job" className="btn btn-primary" onClick={() => navigate('/post-job')}>
                <IconPlus size={16} /> Post a Job
              </button>
              <button id="qa-topup" className="btn btn-success" onClick={() => navigate('/wallet')}>
                <IconWallet size={16} /> Top Up Balance
              </button>
              <button id="qa-view-posts" className="btn btn-secondary" onClick={() => navigate('/my-assignments')}>
                <IconBriefcase size={16} /> Submissions & Posts
              </button>
              <button id="qa-browse-jobs" className="btn btn-ghost" onClick={() => navigate('/jobs')}>
                <IconSearch size={16} /> Explore All Jobs
              </button>
            </>
          )}
          {isFreelancer && (
            <>
              <button id="qa-find-work" className="btn btn-primary" onClick={() => navigate('/jobs')}>
                <IconSearch size={16} /> Find Work
              </button>
              <button id="qa-my-work" className="btn btn-secondary" onClick={() => navigate('/my-assignments')}>
                <IconBriefcase size={16} /> My Assignments
              </button>
              <button id="qa-wallet" className="btn btn-ghost" onClick={() => navigate('/wallet')}>
                <IconWallet size={16} /> View Earnings & Ledger
              </button>
            </>
          )}
        </div>
      </div>

      {/* Admin Notes Modal */}
      {notesModalJob && (
        <div className="modal-overlay" onClick={() => setNotesModalJob(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modAction === 'REQUEST_CHANGES' ? 'Request Post Changes' : modAction === 'REJECT_APPEAL' ? 'Reject Appeal & Suspend' : 'Suspend Job Post'}
              </h3>
              <button className="modal-close-btn" onClick={() => setNotesModalJob(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={e => { e.preventDefault(); handleModerate(notesModalJob.id, modAction, adminNotes); }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '1rem' }}>
                Job Post: "<strong>{notesModalJob.title}</strong>" by @{notesModalJob.client?.username}
              </p>

              <div className="form-group">
                <label className="form-label">Administrator Notes / Feedback *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Detail why changes are required or why this post is being suspended…"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setNotesModalJob(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={modAction === 'REQUEST_CHANGES' ? 'btn btn-secondary' : 'btn btn-danger'}
                  disabled={!adminNotes.trim()}
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* How It Works */}
      {!isAdmin && (
        <>
          <div className="section-title">Workflow Overview</div>
          <div className="stats-grid" style={{ marginBottom: 0 }}>
            {(isClient ? [
              { step: '01', title: 'Post Job with Budget', desc: 'Specify task requirements, skills, budget, and deadline to attract qualified freelancers.' },
              { step: '02', title: 'Freelancer Delivers',   desc: 'Freelancers accept the gig and submit completed deliverables with demo or repository links.' },
              { step: '03', title: 'Review & Settlement',  desc: 'Request revisions or approve the work to instantly release secure escrow funds with a rating.' },
            ] : [
              { step: '01', title: 'Browse & Filter',      desc: 'Discover jobs filtered by category, required skills, budget parameters, and deadlines.' },
              { step: '02', title: 'Complete & Submit',    desc: 'Accept assignments, build the deliverable, and provide submission links and notes.' },
              { step: '03', title: 'Get Paid & Rated',     desc: 'Client approves the deliverable, funds are deposited directly to your wallet, and you earn client reviews.' },
            ]).map((s, i) => (
              <div key={i} className="stat-card" style={{ textAlign: 'left' }}>
                <div style={{
                  display: 'inline-block',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: 'var(--clr-primary-h)',
                  background: 'rgba(var(--clr-primary-rgb), 0.14)',
                  border: '1px solid rgba(var(--clr-primary-rgb), 0.3)',
                  padding: '0.25rem 0.6rem',
                  borderRadius: 'var(--r-sm)',
                  marginBottom: '0.75rem'
                }}>
                  STEP {s.step}
                </div>
                <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--clr-text)' }}>{s.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
