import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from './Toast';
import {
  IconUser,
  IconBriefcase,
  IconStar,
  IconCheck,
  IconCalendar,
  IconArrowUpRight,
  IconArrowLeft
} from './Icons';

const PublicProfile = ({ currentUser }) => {
  const { username } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicProfile();
  }, [username]);

  const fetchPublicProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/user/public/${username}`);
      setProfile(res.data);
    } catch {
      toast.error('User profile not found.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <span className="spinner" style={{ width: 36, height: 36, margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--clr-text-2)' }}>Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconUser size={48} />
          </div>
          <h3>Profile Not Found</h3>
          <p>The user "@{username}" could not be found or does not exist.</p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/jobs')} style={{ marginTop: '0.5rem' }}>
            Explore Jobs
          </button>
        </div>
      </div>
    );
  }

  const isFreelancer = profile.role === 'ROLE_FREELANCER';
  const initials = profile.fullName ? profile.fullName.charAt(0).toUpperCase() : (profile.username ? profile.username.charAt(0).toUpperCase() : '?');
  const skillsList = profile.skills
    ? profile.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="page-content" style={{ animation: 'fadeSlideUp 0.3s ease', maxWidth: '900px', margin: '0 auto' }}>
      {/* Back Button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <IconArrowLeft size={15} /> Back
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="form-card" style={{ padding: '2rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--grad-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'white',
              flexShrink: 0,
              boxShadow: 'var(--shadow-glow-sm)',
            }}>
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                  {profile.fullName || profile.username}
                </h1>
                <span className={`role-badge ${isFreelancer ? 'freelancer' : 'client'}`}>
                  {isFreelancer ? 'Freelancer' : 'Client'}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', color: 'var(--clr-text-2)', fontSize: '0.9rem' }}>
                @{profile.username}
              </p>
              {profile.headline && (
                <p style={{ margin: '0.35rem 0 0', fontWeight: 600, color: 'var(--clr-text)', fontSize: '0.95rem' }}>
                  {profile.headline}
                </p>
              )}
            </div>
          </div>

          {/* Social / External links */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {profile.portfolioUrl && (
              <a
                href={profile.portfolioUrl.startsWith('http') ? profile.portfolioUrl : `https://${profile.portfolioUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Portfolio <IconArrowUpRight size={13} />
              </a>
            )}
            {profile.githubUrl && (
              <a
                href={profile.githubUrl.startsWith('http') ? profile.githubUrl : `https://${profile.githubUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                GitHub / Profile <IconArrowUpRight size={13} />
              </a>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--clr-border)', fontSize: '0.8rem', color: 'var(--clr-text-3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IconCalendar size={14} /> Member since {formatDate(profile.createdAt)}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {isFreelancer ? (
          <>
            <div className="stat-card">
              <div className="stat-card-icon green">
                <IconStar size={20} filled />
              </div>
              <div className="stat-card-value">
                {profile.averageRating > 0 ? `${profile.averageRating} / 5.0` : 'New'}
              </div>
              <div className="stat-card-label">Average Client Rating</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon purple">
                <IconCheck size={20} />
              </div>
              <div className="stat-card-value">{profile.completedGigs || 0}</div>
              <div className="stat-card-label">Completed Gigs</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon cyan">
                <IconStar size={20} />
              </div>
              <div className="stat-card-value">{profile.totalReviews || 0}</div>
              <div className="stat-card-label">Verified Client Reviews</div>
            </div>
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-card-icon purple">
                <IconBriefcase size={20} />
              </div>
              <div className="stat-card-value">{profile.totalPostedJobs || 0}</div>
              <div className="stat-card-label">Total Jobs Posted</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon green">
                <IconCheck size={20} />
              </div>
              <div className="stat-card-value">{profile.completedJobs || 0}</div>
              <div className="stat-card-label">Completed Projects</div>
            </div>
          </>
        )}
      </div>

      {/* Bio / About */}
      {profile.bio && (
        <div className="form-card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>About</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--clr-text-2)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
            {profile.bio}
          </p>
        </div>
      )}

      {/* Skills */}
      {skillsList.length > 0 && (
        <div className="form-card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Skills & Expertise</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {skillsList.map((skill, idx) => (
              <span key={idx} className="skill-chip" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Verified Reviews Section (for Freelancer) */}
      {isFreelancer && (
        <div className="form-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Verified Client Reviews ({profile.reviews?.length || 0})
            </h3>
          </div>

          {!profile.reviews || profile.reviews.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--clr-text-3)', margin: '0.5rem 0' }}>
              No client reviews yet. Once this freelancer completes a job, verified client feedback will appear here.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {profile.reviews.map((rev, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--clr-surface-2)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 'var(--r-md)',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rev.clientName}</span>
                      {rev.jobCategory && <span className="category-badge">{rev.jobCategory}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map(st => (
                        <IconStar key={st} size={14} filled={st <= rev.rating} />
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)', marginBottom: '0.5rem' }}>
                    Project: <strong>{rev.jobTitle}</strong> • {formatDate(rev.reviewedAt)}
                  </div>
                  {rev.review ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', margin: 0, fontStyle: 'italic' }}>
                      "{rev.review}"
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)', margin: 0, fontStyle: 'italic' }}>
                      Rating awarded without comment.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Posted Jobs (for Client) */}
      {!isFreelancer && profile.recentJobs && profile.recentJobs.length > 0 && (
        <div className="form-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>
            Recent Job Postings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {profile.recentJobs.map(job => (
              <div
                key={job.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: 'var(--clr-surface-2)',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--clr-border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{job.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>
                    Posted {formatDate(job.createdAt)} • {job.category || 'General'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--clr-success)', fontSize: '0.9rem' }}>
                    ${Number(job.amount).toFixed(2)}
                  </span>
                  <span className="badge badge-open">{job.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfile;
