import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
  IconWallet,
  IconBriefcase,
  IconClock,
  IconCheck,
  IconSearch,
  IconPlus,
  IconStar,
  IconUser,
  IconAlert
} from './Icons';

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'ROLE_ADMIN';
  const isClient = user?.role === 'ROLE_CLIENT';
  const isFreelancer = user?.role === 'ROLE_FREELANCER';

  useEffect(() => {
    fetchStats();
    refreshUser();
  }, []);

  const refreshUser = async () => {
    try {
      const res = await api.get('/user/me');
      if (res.data && res.data.balance !== undefined) {
        const updated = { ...user, balance: res.data.balance };
        localStorage.setItem('user', JSON.stringify(updated));
        if (setUser) setUser(updated);
      }
    } catch { /* non-critical */ }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const res = await api.get('/admin/stats');
        setAdminStats(res.data);
      } else if (isClient) {
        const res = await api.get('/work');
        const all = res.data;
        const myJobs = all.filter(w => w.client?.username === user.username);
        const open     = myJobs.filter(w => w.status === 'OPEN').length;
        const assigned = myJobs.filter(w => w.status === 'ASSIGNED').length;
        const done     = myJobs.filter(w => w.status === 'COMPLETED').length;
        setStats({ total: myJobs.length, open, assigned, done });
      } else {
        const [workRes, assignRes] = await Promise.all([
          api.get('/work'),
          api.get('/assignments/my').catch(() => ({ data: [] })),
        ]);
        const openJobs = workRes.data.filter(w => w.status === 'OPEN').length;
        const myAssignments = assignRes.data || [];
        const active = myAssignments.filter(a => a.status === 'ACCEPTED' || a.status === 'IN_PROGRESS' || a.status === 'REVISION_REQUESTED').length;
        const completed = myAssignments.filter(a => a.status === 'COMPLETED').length;
        
        // Calculate average rating
        const ratedAssignments = myAssignments.filter(a => a.status === 'COMPLETED' && a.rating);
        const avgRating = ratedAssignments.length > 0
          ? (ratedAssignments.reduce((acc, curr) => acc + curr.rating, 0) / ratedAssignments.length).toFixed(1)
          : null;

        setStats({ openJobs, active, completed, avgRating, totalRated: ratedAssignments.length });
      }
    } catch {
      setStats({});
    } finally {
      setLoading(false);
    }
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
            icon={<IconClock size={22} />} label="Total Assignments"
            value={adminStats?.totalAssignments ?? 0} color="purple"
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

      {/* Quick Actions */}
      <div className="quick-actions">
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
