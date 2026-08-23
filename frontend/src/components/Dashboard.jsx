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
  IconClose,
  IconLock,
  IconSparkles,
  IconSend
} from './Icons';

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [flaggedJobs, setFlaggedJobs] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ topRated: [], topCompleted: [] });
  const [clientFlaggedList, setClientFlaggedList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Moderation state
  const [modLoading, setModLoading] = useState(null);
  const [notesModalJob, setNotesModalJob] = useState(null);
  const [modAction, setModAction] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Admin Drill-Down Modal State
  const [drillModalType, setDrillModalType] = useState(null); // 'USERS' | 'CLIENTS' | 'FREELANCERS' | 'JOBS' | null
  const [drillData, setDrillData] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillRoleFilter, setDrillRoleFilter] = useState('');
  const [drillJobStatusFilter, setDrillJobStatusFilter] = useState('');
  const [manualFlagJob, setManualFlagJob] = useState(null);
  const [manualFlagReason, setManualFlagReason] = useState('');
  const [manualFlagLoading, setManualFlagLoading] = useState(false);

  // Client Notice Modal State
  const [clientNoticeJob, setClientNoticeJob] = useState(null);

  const isAdmin = user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const isClient = user?.role === 'ROLE_CLIENT' || user?.role === 'CLIENT';
  const isFreelancer = user?.role === 'ROLE_FREELANCER' || user?.role === 'FREELANCER' || (!isAdmin && !isClient);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [statsRes, flaggedRes, leaderRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/work-requests/flagged').catch(() => ({ data: [] })),
          api.get('/leaderboard/top-freelancers').catch(() => ({ data: { topRated: [], topCompleted: [] } }))
        ]);
        setAdminStats(statsRes.data);
        setFlaggedJobs(flaggedRes.data || []);
        setLeaderboard(leaderRes.data || { topRated: [], topCompleted: [] });
      } else if (isClient) {
        const [workRes, leaderRes] = await Promise.all([
          api.get('/work'),
          api.get('/leaderboard/top-freelancers').catch(() => ({ data: { topRated: [], topCompleted: [] } }))
        ]);
        const all = workRes.data || [];
        const myJobs = all.filter(w => w.client?.username === user?.username);
        const open = myJobs.filter(w => w.status === 'OPEN').length;
        const assigned = myJobs.filter(w => w.status === 'ASSIGNED').length;
        const done = myJobs.filter(w => w.status === 'COMPLETED').length;
        const flagged = myJobs.filter(w => w.status === 'FLAGGED');

        setStats({ total: myJobs.length, open, assigned, done, flagged: flagged.length });
        setClientFlaggedList(flagged);
        setLeaderboard(leaderRes.data || { topRated: [], topCompleted: [] });
      } else {
        const [workRes, assignRes, leaderRes] = await Promise.all([
          api.get('/work').catch(() => ({ data: [] })),
          api.get('/assignments/my').catch(() => ({ data: [] })),
          api.get('/leaderboard/top-freelancers').catch(() => ({ data: { topRated: [], topCompleted: [] } }))
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
        setLeaderboard(leaderRes.data || { topRated: [], topCompleted: [] });
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

  /* ── ADMIN: Handle Moderation ── */
  const handleModerate = async (jobId, action, notes = '') => {
    setModLoading(jobId);
    try {
      await api.patch(`/admin/work-requests/${jobId}/moderate`, {
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

  /* ── ADMIN: Drill-Down Center ── */
  const openDrillDown = async (type) => {
    setDrillModalType(type);
    setDrillLoading(true);
    try {
      if (type === 'USERS') {
        const res = await api.get('/admin/users?size=50');
        setDrillData(res.data?.content || []);
      } else if (type === 'CLIENTS') {
        const res = await api.get('/admin/clients');
        setDrillData(res.data || []);
      } else if (type === 'FREELANCERS') {
        const res = await api.get('/admin/freelancers');
        setDrillData(res.data || []);
      } else if (type === 'JOBS') {
        const res = await api.get('/admin/work-requests?size=50');
        setDrillData(res.data?.content || []);
      }
    } catch {
      toast.error('Failed to load drill-down data.');
    } finally {
      setDrillLoading(false);
    }
  };

  const handleToggleLock = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/lock?locked=${!currentStatus}`);
      toast.success(`User #${userId} lock status updated to: ${!currentStatus}`);
      setDrillData(prev => prev.map(u => u.id === userId ? { ...u, locked: !currentStatus } : u));
    } catch {
      toast.error('Failed to update lock status.');
    }
  };

  const handleManualFlagSubmit = async (e) => {
    e.preventDefault();
    if (!manualFlagJob || !manualFlagReason.trim()) return;

    setManualFlagLoading(true);
    try {
      await api.patch(`/admin/work-requests/${manualFlagJob.id}/flag-manual`, {
        moderationReason: manualFlagReason.trim()
      });
      toast.success(`Job #${manualFlagJob.id} manually flagged and moved to moderation queue.`);
      setManualFlagJob(null);
      setManualFlagReason('');
      fetchStats();
      if (drillModalType === 'JOBS') {
        openDrillDown('JOBS');
      }
    } catch (err) {
      toast.error('Failed to manually flag job.');
    } finally {
      setManualFlagLoading(false);
    }
  };

  const StatCard = ({ icon, label, value, color, onClick, subtitle }) => (
    <div className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default', position: 'relative' }} onClick={onClick}>
      <div className={`stat-card-icon ${color}`}>{icon}</div>
      <div className="stat-card-value">{loading ? '—' : value}</div>
      <div className="stat-card-label">{label}</div>
      {subtitle && <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-3)', marginTop: '0.25rem' }}>{subtitle}</div>}
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
        <p>Welcome back, <strong>{user?.fullName || user?.username}</strong>. Platform overview and live intelligence.</p>
      </div>

      {/* CLIENT: High-Visibility Flagged Banner Notice */}
      {isClient && clientFlaggedList.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--r-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--clr-error)', fontSize: '0.95rem' }}>
                Action Required: {clientFlaggedList.length} Job Post{clientFlaggedList.length > 1 ? 's' : ''} Flagged for Review
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--clr-text-2)', marginTop: '0.2rem' }}>
                Your post was flagged for policy review. You can edit to resolve keywords or submit an appeal.
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setClientNoticeJob(clientFlaggedList[0])}
          >
            Review Flagged Post
          </button>
        </div>
      )}

      {/* Admin Stats Grid (Interactive Drill-Downs) */}
      {isAdmin && (
        <div className="stats-grid">
          <StatCard
            icon={<IconUser size={22} />} label="Total Users"
            value={adminStats?.totalUsers ?? 0} color="cyan"
            subtitle="Click to view & lock users"
            onClick={() => openDrillDown('USERS')}
          />
          <StatCard
            icon={<IconBriefcase size={22} />} label="Total Clients"
            value={adminStats?.totalClients ?? 0} color="purple"
            subtitle="Click for escrow & spending"
            onClick={() => openDrillDown('CLIENTS')}
          />
          <StatCard
            icon={<IconStar size={22} />} label="Total Freelancers"
            value={adminStats?.totalFreelancers ?? 0} color="green"
            subtitle="Click for talent analytics"
            onClick={() => openDrillDown('FREELANCERS')}
          />
          <StatCard
            icon={<IconCheck size={22} />} label="Total Jobs Posted"
            value={adminStats?.totalJobs ?? 0} color="amber"
            subtitle="Click to inspect & flag"
            onClick={() => openDrillDown('JOBS')}
          />
          <StatCard
            icon={<IconAlert size={22} />} label="Flagged for Moderation"
            value={adminStats?.flaggedJobs ?? flaggedJobs.length} color="amber"
            subtitle="Pending appeal review"
          />
        </div>
      )}

      {/* Client Stats Grid */}
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

      {/* Freelancer Stats Grid */}
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

      {/* Real-Time Freelancers Dynamic Leaderboard Widget */}
      <div style={{ marginTop: '2rem', background: 'var(--clr-surface-1)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-lg)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconSparkles size={18} style={{ color: 'var(--clr-accent)' }} />
              Real-Time Talent Leaderboard (Redis Sorted Sets)
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--clr-text-3)', margin: '0.2rem 0 0' }}>
              Dynamic live rankings updated instantly on job approvals and client reviews.
            </p>
          </div>
          <span className="badge badge-open" style={{ fontSize: '0.72rem' }}>
            ⚡ Live Redis ZSET
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Top Rated */}
          <div style={{ background: 'var(--clr-surface-2)', borderRadius: 'var(--r-md)', padding: '1rem', border: '1px solid var(--clr-border)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--clr-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⭐ Top Rated Freelancers
            </h4>
            {leaderboard.topRated?.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)' }}>No ratings recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {leaderboard.topRated.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem', padding: '0.4rem 0.6rem', background: 'var(--clr-surface-1)', borderRadius: 'var(--r-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#D97706', width: '16px' }}>#{f.rank}</span>
                      <strong style={{ cursor: 'pointer', color: 'var(--clr-primary)' }} onClick={() => navigate(`/user/${f.username}`)}>
                        @{f.username}
                      </strong>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--clr-accent)' }}>
                      ★ {Number(f.score).toFixed(1)} / 5.0
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Completed Gigs */}
          <div style={{ background: 'var(--clr-surface-2)', borderRadius: 'var(--r-md)', padding: '1rem', border: '1px solid var(--clr-border)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--clr-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🏆 Most Completed Gigs
            </h4>
            {leaderboard.topCompleted?.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)' }}>No completed gigs recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {leaderboard.topCompleted.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem', padding: '0.4rem 0.6rem', background: 'var(--clr-surface-1)', borderRadius: 'var(--r-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#D97706', width: '16px' }}>#{f.rank}</span>
                      <strong style={{ cursor: 'pointer', color: 'var(--clr-primary)' }} onClick={() => navigate(`/user/${f.username}`)}>
                        @{f.username}
                      </strong>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--clr-success)' }}>
                      {Math.round(f.score)} gigs done
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADMIN: Post Moderation Queue */}
      {isAdmin && (
        <div style={{ marginTop: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-text)' }}>
                🛡️ Post Moderation & Appeal Queue
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginTop: '0.2rem' }}>
                Review intercepted job posts, evaluate client appeal notes, and make moderation decisions.
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
                            Client: <strong>@{job.client?.username}</strong>
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--clr-text)' }}>{job.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                          {job.description}
                        </p>

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
      <div className="quick-actions" style={{ marginTop: '2.5rem' }}>
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
            </>
          )}
          {isFreelancer && (
            <>
              <button id="qa-find-work" className="btn btn-primary" onClick={() => navigate('/jobs')}>
                <IconSearch size={16} /> Find Work & Submit Bids
              </button>
              <button id="qa-my-work" className="btn btn-secondary" onClick={() => navigate('/my-assignments')}>
                <IconBriefcase size={16} /> My Assignments & Applications
              </button>
              <button id="qa-wallet" className="btn btn-ghost" onClick={() => navigate('/wallet')}>
                <IconWallet size={16} /> View Earnings
              </button>
            </>
          )}
        </div>
      </div>

      {/* ADMIN: Drill-Down Drawer Modal */}
      {drillModalType && (
        <div className="modal-overlay" onClick={() => setDrillModalType(null)}>
          <div className="modal-card" style={{ maxWidth: '900px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {drillModalType === 'USERS' && '👥 User Management & Lock Center'}
                {drillModalType === 'CLIENTS' && '💼 Client Escrow & Project Analytics'}
                {drillModalType === 'FREELANCERS' && '⭐ Freelancer Performance & Ratings'}
                {drillModalType === 'JOBS' && '📋 All Platform Jobs & Manual Moderation'}
              </h3>
              <button className="modal-close-btn" onClick={() => setDrillModalType(null)}>
                <IconClose size={16} />
              </button>
            </div>

            {drillLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <span className="spinner" style={{ width: 28, height: 28 }} />
                <p style={{ marginTop: '0.75rem', color: 'var(--clr-text-3)' }}>Loading analytics drill-down…</p>
              </div>
            ) : (
              <div>
                {/* 1. USERS DRILL DOWN */}
                {drillModalType === 'USERS' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--clr-border)', textAlign: 'left', color: 'var(--clr-text-3)' }}>
                          <th style={{ padding: '0.6rem 0.5rem' }}>User</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Role</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Balance</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Activity</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Status</th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drillData.map(u => (
                          <tr key={u.id} style={{ borderBottom: '1px solid var(--clr-border)' }}>
                            <td style={{ padding: '0.65rem 0.5rem' }}>
                              <strong>{u.fullName || u.username}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>@{u.username} • {u.email}</div>
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>
                              <span className="category-badge">{u.role?.replace('ROLE_', '')}</span>
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: 'var(--clr-primary)' }}>
                              ${Number(u.balance || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.78rem', color: 'var(--clr-text-2)' }}>
                              {u.role === 'ROLE_CLIENT' ? `${u.postedJobsCount || 0} jobs posted` : `${u.completedAssignmentsCount || 0} gigs completed`}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: u.locked ? 'var(--clr-error)' : 'var(--clr-success)', background: u.locked ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', padding: '2px 7px', borderRadius: '4px' }}>
                                {u.locked ? 'LOCKED' : 'ACTIVE'}
                              </span>
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                              {u.role !== 'ROLE_ADMIN' && (
                                <button
                                  className={`btn btn-sm ${u.locked ? 'btn-success' : 'btn-ghost'}`}
                                  style={u.locked ? {} : { color: 'var(--clr-error)', borderColor: 'rgba(239,68,68,0.3)' }}
                                  onClick={() => handleToggleLock(u.id, u.locked)}
                                >
                                  {u.locked ? 'Unlock Account' : 'Lock Account'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 2. CLIENTS DRILL DOWN */}
                {drillModalType === 'CLIENTS' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--clr-border)', textAlign: 'left', color: 'var(--clr-text-3)' }}>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Client</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Total Posted</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Active Gigs</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Completed Gigs</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Total Spent</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Wallet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drillData.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--clr-border)' }}>
                            <td style={{ padding: '0.65rem 0.5rem' }}>
                              <strong>{c.fullName || c.username}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>@{c.username}</div>
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{c.totalPostedJobs}</td>
                            <td style={{ padding: '0.65rem 0.5rem', color: 'var(--clr-accent)' }}>{c.activeGigsCount}</td>
                            <td style={{ padding: '0.65rem 0.5rem', color: 'var(--clr-success)' }}>{c.completedGigsCount}</td>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700 }}>${Number(c.totalSpent || 0).toFixed(2)}</td>
                            <td style={{ padding: '0.65rem 0.5rem', color: 'var(--clr-primary)', fontWeight: 700 }}>${Number(c.balance || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. FREELANCERS DRILL DOWN */}
                {drillModalType === 'FREELANCERS' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--clr-border)', textAlign: 'left', color: 'var(--clr-text-3)' }}>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Freelancer</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Completed Gigs</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Active Gigs</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Average Rating</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Wallet Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drillData.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid var(--clr-border)' }}>
                            <td style={{ padding: '0.65rem 0.5rem' }}>
                              <strong>{f.fullName || f.username}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>@{f.username}</div>
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: 'var(--clr-success)' }}>{f.completedGigsCount}</td>
                            <td style={{ padding: '0.65rem 0.5rem', color: 'var(--clr-accent)' }}>{f.activeGigsCount}</td>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: 'var(--clr-accent)' }}>
                              {f.averageRating ? `★ ${f.averageRating} (${f.totalReviews || 0})` : 'New'}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', color: 'var(--clr-primary)', fontWeight: 700 }}>${Number(f.balance || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 4. JOBS DRILL DOWN (With Manual Override) */}
                {drillModalType === 'JOBS' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--clr-border)', textAlign: 'left', color: 'var(--clr-text-3)' }}>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Job Title</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Client</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Budget</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Status</th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drillData.map(j => (
                          <tr key={j.id} style={{ borderBottom: '1px solid var(--clr-border)' }}>
                            <td style={{ padding: '0.65rem 0.5rem' }}>
                              <strong>{j.title}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>#{j.id} • {j.category}</div>
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>@{j.client?.username}</td>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: 'var(--clr-primary)' }}>${Number(j.amount).toFixed(2)}</td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>
                              <span className="badge badge-open" style={{ fontSize: '0.72rem' }}>{j.status}</span>
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                              {j.status !== 'FLAGGED' && j.status !== 'SUSPENDED' && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--clr-error)', borderColor: 'rgba(239,68,68,0.3)', fontSize: '0.75rem' }}
                                  onClick={() => { setManualFlagJob(j); setManualFlagReason(''); }}
                                >
                                  🛑 Manual Flag
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Moderation Flag Modal */}
      {manualFlagJob && (
        <div className="modal-overlay" onClick={() => setManualFlagJob(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manual Policy Flag Override</h3>
              <button className="modal-close-btn" onClick={() => setManualFlagJob(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handleManualFlagSubmit}>
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '1rem' }}>
                Flagging post: "<strong>{manualFlagJob.title}</strong>" by @{manualFlagJob.client?.username}. This will immediately hide the post from public listings and alert the client.
              </p>

              <div className="form-group">
                <label className="form-label">Reason for Manual Flag *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Specify violation (e.g. Disguised contact info, off-platform payment attempt, TOS violation)…"
                  value={manualFlagReason}
                  onChange={e => setManualFlagReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setManualFlagJob(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={manualFlagLoading || !manualFlagReason.trim()}>
                  {manualFlagLoading ? <><span className="spinner" /> Flagging…</> : 'Confirm Manual Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLIENT: Moderation Notice Modal */}
      {clientNoticeJob && (
        <div className="modal-overlay" onClick={() => setClientNoticeJob(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Policy Moderation Notice</h3>
              <button className="modal-close-btn" onClick={() => setClientNoticeJob(null)}>
                <IconClose size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--clr-text-2)', lineHeight: 1.5 }}>
                Your job post "<strong>{clientNoticeJob.title}</strong>" was intercepted by our policy system.
              </p>

              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--r-md)', padding: '0.85rem 1rem', marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.825rem', color: 'var(--clr-error)', fontWeight: 700 }}>
                  Interception Reason:
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--clr-text-1)', marginTop: '0.25rem' }}>
                  {clientNoticeJob.moderationReason || 'Prohibited contact or payment details detected.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setClientNoticeJob(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setClientNoticeJob(null);
                  navigate('/my-assignments');
                }}
              >
                Go to My Jobs to Edit & Appeal
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default Dashboard;
