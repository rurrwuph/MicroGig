import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import { useToast } from './Toast';
import { IconUser, IconLock } from './Icons';

const SUGGESTED_SKILLS = [
  'React', 'Node.js', 'Spring Boot', 'Java', 'Python', 'PostgreSQL',
  'Docker', 'Figma', 'UI/UX Design', 'TypeScript', 'AWS', 'Git'
];

const Profile = ({ user, setUser }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const isClient = user?.role === 'ROLE_CLIENT';
  const isFreelancer = user?.role === 'ROLE_FREELANCER';

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    headline: '',
    bio: '',
    skills: '',
    portfolioUrl: '',
    githubUrl: '',
  });

  // Password Form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/user/profile');
      const data = res.data;
      setProfileForm({
        fullName:     data.fullName || '',
        headline:     data.headline || '',
        bio:          data.bio || '',
        skills:       data.skills || '',
        portfolioUrl: data.portfolioUrl || '',
        githubUrl:    data.githubUrl || '',
      });
      // Update local storage user state with latest details
      const updatedUser = { ...user, ...data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      if (setUser) setUser(updatedUser);
    } catch {
      toast.error('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await api.put('/user/profile', profileForm);
      const updatedUser = { ...user, ...res.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      if (setUser) setUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to update profile.');
      toast.error(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.post('/user/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to change password. Please check your current password.');
      toast.error(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const toggleSkill = (skill) => {
    const current = profileForm.skills
      ? profileForm.skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    let updated;
    if (current.includes(skill)) {
      updated = current.filter(s => s !== skill);
    } else {
      updated = [...current, skill];
    }
    setProfileForm(f => ({ ...f, skills: updated.join(', ') }));
  };

  const initials = user?.username ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <div className="page-content" style={{ animation: 'fadeSlideUp 0.3s ease', maxWidth: '780px', margin: '0 auto' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <h1>Account & Profile Settings</h1>
        </div>
        <p>Manage your public identity, contact information, and security</p>
      </div>

      {/* User Summary Header Card */}
      <div className="form-card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 1.5rem' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: 'var(--grad-brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 800, color: 'white', flexShrink: 0
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{profileForm.fullName || user?.username}</h2>
            <span className={`role-badge ${isClient ? 'client' : 'freelancer'}`}>
              {isClient ? 'Client' : 'Freelancer'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--clr-text-2)' }}>
            @{user?.username} • {user?.email}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="filter-chips" style={{ marginBottom: '1.25rem' }}>
        <span
          className={`chip ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <IconUser size={14} />
          Profile Information
        </span>
        <span
          className={`chip ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <IconLock size={14} />
          Security & Password
        </span>
      </div>

      {/* TAB 1: Profile Information */}
      {activeTab === 'profile' && (
        <div className="form-card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            {isClient ? 'Company / Client Profile' : 'Professional Freelancer Profile'}
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <span className="spinner" style={{ width: 24, height: 24 }} />
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-fullname">
                    {isClient ? 'Full Name / Company Name' : 'Full Name'}
                  </label>
                  <input
                    id="profile-fullname"
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={profileForm.fullName}
                    onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="profile-headline">
                    {isClient ? 'Company Tagline / Title' : 'Professional Headline'}
                  </label>
                  <input
                    id="profile-headline"
                    type="text"
                    className="form-input"
                    placeholder={isClient ? 'e.g. Founder at Acme Tech' : 'e.g. Senior Full-Stack Engineer | React & Spring'}
                    value={profileForm.headline}
                    onChange={e => setProfileForm(f => ({ ...f, headline: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-bio">About / Bio</label>
                <textarea
                  id="profile-bio"
                  className="form-input"
                  rows={4}
                  placeholder={isClient
                    ? 'Tell freelancers about your company, mission, and the type of work you post…'
                    : 'Describe your expertise, experience, and past work highlights…'
                  }
                  value={profileForm.bio}
                  onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                />
              </div>

              {/* Skills (Especially for Freelancers, optional for Clients) */}
              {isFreelancer && (
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-skills">Skills & Expertise (comma-separated)</label>
                  <input
                    id="profile-skills"
                    type="text"
                    className="form-input"
                    placeholder="React, Spring Boot, PostgreSQL, Docker"
                    value={profileForm.skills}
                    onChange={e => setProfileForm(f => ({ ...f, skills: e.target.value }))}
                  />

                  {/* Suggested Skill Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', alignSelf: 'center', marginRight: '0.25rem' }}>
                      Suggested:
                    </span>
                    {SUGGESTED_SKILLS.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        className="skill-tag-btn"
                        onClick={() => toggleSkill(skill)}
                      >
                        + {skill}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-portfolio">
                    {isClient ? 'Company / Personal Website' : 'Portfolio URL'}
                  </label>
                  <input
                    id="profile-portfolio"
                    type="text"
                    className="form-input"
                    placeholder="https://myportfolio.dev"
                    value={profileForm.portfolioUrl}
                    onChange={e => setProfileForm(f => ({ ...f, portfolioUrl: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="profile-github">
                    {isClient ? 'LinkedIn / Social URL' : 'GitHub / Git Profile URL'}
                  </label>
                  <input
                    id="profile-github"
                    type="text"
                    className="form-input"
                    placeholder={isClient ? 'https://linkedin.com/company/acme' : 'https://github.com/username'}
                    value={profileForm.githubUrl}
                    onChange={e => setProfileForm(f => ({ ...f, githubUrl: e.target.value }))}
                  />
                </div>
              </div>

              <div className="divider" />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={profileSaving}
                  style={{ minWidth: '140px' }}
                >
                  {profileSaving ? <><span className="spinner" /> Saving…</> : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: Security & Change Password */}
      {activeTab === 'security' && (
        <div className="form-card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Change Account Password</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '1.25rem' }}>
            Choose a strong password with at least 6 characters.
          </p>

          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label className="form-label" htmlFor="pwd-current">Current Password *</label>
              <input
                id="pwd-current"
                type="password"
                required
                className="form-input"
                placeholder="Enter current password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="pwd-new">New Password *</label>
                <input
                  id="pwd-new"
                  type="password"
                  required
                  className="form-input"
                  placeholder="At least 6 characters"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pwd-confirm">Confirm New Password *</label>
                <input
                  id="pwd-confirm"
                  type="password"
                  required
                  className="form-input"
                  placeholder="Repeat new password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                />
              </div>
            </div>

            <div className="divider" />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-warning"
                disabled={passwordSaving || !passwordForm.currentPassword || !passwordForm.newPassword}
                style={{ minWidth: '160px' }}
              >
                {passwordSaving ? <><span className="spinner" /> Updating…</> : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
