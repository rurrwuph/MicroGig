import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import { useToast } from './Toast';
import {
  IconArrowLeft,
  IconCalendar,
  IconCheckCircle,
  IconAlert,
  IconPlus,
  IconBriefcase,
  IconWallet
} from './Icons';

const CATEGORIES = [
  'Web Development',
  'Mobile Apps',
  'UI/UX & Graphic Design',
  'Bug Fixes & DevOps',
  'Data Science & AI',
  'Writing & Translation',
  'Other',
];

const SUGGESTED_SKILLS = [
  'React', 'Node.js', 'Spring Boot', 'Python', 'Java', 'PostgreSQL',
  'Figma', 'UI Design', 'Docker', 'REST API', 'JavaScript', 'TypeScript'
];

const PostJob = ({ user, setUser }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const dateInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Web Development',
    skills: '',
    amount: '',
    deadline: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Sync real-time balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await api.get('/user/me');
        if (res.data?.balance !== undefined && setUser) {
          const updated = { ...user, balance: res.data.balance };
          setUser(updated);
        }
      } catch {
        // non-critical
      }
    };
    fetchBalance();
  }, []);

  const update = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  };

  const addSkill = (skill) => {
    const currentSkills = form.skills
      ? form.skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    if (!currentSkills.includes(skill)) {
      currentSkills.push(skill);
      update('skills', currentSkills.join(', '));
    }
  };

  // Helper to quickly select deadline presets
  const setDeadlinePreset = (daysFromNow) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    update('deadline', formatted);
  };

  const openDatePicker = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  const balance = Number(user?.balance ?? 0);

  const validate = () => {
    const errs = {};
    if (!form.title.trim())       errs.title       = 'Job title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.amount || Number(form.amount) <= 0)
      errs.amount = 'Enter a valid budget (> $0)';
    else if (Number(form.amount) > balance)
      errs.amount = `Budget ($${Number(form.amount).toFixed(2)}) exceeds your wallet balance ($${balance.toFixed(2)}). Top up first.`;
    if (!form.deadline)           errs.deadline    = 'Deadline is required';
    else if (new Date(form.deadline) <= new Date())
      errs.deadline = 'Deadline must be in the future';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const res = await api.post('/work', {
        title:       form.title.trim(),
        description: form.description.trim(),
        category:    form.category,
        skills:      form.skills.trim(),
        amount:      Number(form.amount),
        deadline:    new Date(form.deadline + 'T23:59:59').toISOString(),
      });
      if (res.data?.status === 'FLAGGED') {
        toast.warning('Job posted, but FLAGGED for review: ' + (res.data.moderationReason || 'Policy check violation detected.'));
      } else {
        toast.success('Job posted successfully! Freelancers can now apply.');
      }
      if (setUser) {
        try {
          const me = await api.get('/user/me');
          if (me.data?.balance !== undefined) {
            setUser({ ...user, balance: me.data.balance });
          }
        } catch { /* ignore */ }
      }
      navigate('/my-assignments');
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to post job. Please try again.');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Min date for deadline: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="page-content" style={{ animation: 'fadeSlideUp 0.3s ease', maxWidth: '780px', margin: '0 auto' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <IconArrowLeft size={15} /> Back
          </button>
          <h1>Post a Job</h1>
        </div>
        <p>Describe your project, specify required skills, set a budget & deadline to find top talent</p>
      </div>

      {/* Form Card */}
      <div className="form-card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconBriefcase size={20} style={{ color: 'var(--clr-primary)' }} />
          Project Requirements & Details
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="job-title">Job Title *</label>
            <input
              id="job-title"
              className={`form-input ${errors.title ? 'error' : ''}`}
              type="text"
              placeholder="e.g. Build a Responsive React Landing Page"
              value={form.title}
              onChange={e => update('title', e.target.value)}
            />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="job-category">Category *</label>
              <select
                id="job-category"
                className="form-input"
                value={form.category}
                onChange={e => update('category', e.target.value)}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="job-budget">Budget (USD) *</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--clr-text-3)', fontWeight: 600
                }}>$</span>
                <input
                  id="job-budget"
                  className={`form-input ${errors.amount ? 'error' : ''}`}
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => update('amount', e.target.value)}
                  style={{ paddingLeft: '1.75rem' }}
                />
              </div>
              {errors.amount && <span className="form-error">{errors.amount}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="job-skills">Required Skills (Comma separated)</label>
            <input
              id="job-skills"
              className="form-input"
              type="text"
              placeholder="e.g. React, Spring Boot, PostgreSQL"
              value={form.skills}
              onChange={e => update('skills', e.target.value)}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', alignSelf: 'center', marginRight: '0.25rem' }}>Suggested:</span>
              {SUGGESTED_SKILLS.map(s => (
                <button
                  key={s}
                  type="button"
                  className="skill-tag-btn"
                  onClick={() => addSkill(s)}
                >
                  <IconPlus size={12} style={{ display: 'inline', marginRight: '3px' }} />
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="job-description">Description *</label>
            <textarea
              id="job-description"
              className={`form-input ${errors.description ? 'error' : ''}`}
              placeholder="Describe what needs to be done, deliverables, technical stack, etc."
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={6}
            />
            {errors.description && <span className="form-error">{errors.description}</span>}
          </div>

          {/* Enhanced Deadline Picker with Calendar & Presets */}
          <div className="form-group">
            <label className="form-label" htmlFor="job-deadline">
              Deadline & Completion Target *
            </label>
            <div
              className={`calendar-picker-wrapper ${errors.deadline ? 'error' : ''}`}
              onClick={openDatePicker}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--clr-surface-2)',
                border: `1px solid ${errors.deadline ? 'var(--clr-error)' : 'var(--clr-border)'}`,
                borderRadius: 'var(--r-md)',
                padding: '0.25rem 0.75rem',
                cursor: 'pointer',
                transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
              }}
            >
              <span style={{ color: 'var(--clr-primary)', display: 'flex', alignItems: 'center', marginRight: '0.75rem' }}>
                <IconCalendar size={20} />
              </span>
              <input
                ref={dateInputRef}
                id="job-deadline"
                className="calendar-input"
                type="date"
                min={minDate}
                value={form.deadline}
                onChange={e => update('deadline', e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--clr-text)',
                  fontSize: '0.95rem',
                  padding: '0.5rem 0',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); openDatePicker(); }}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: 'var(--r-sm)' }}
              >
                Choose Date
              </button>
            </div>
            {errors.deadline && <span className="form-error">{errors.deadline}</span>}

            {/* Quick preset buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginRight: '0.25rem' }}>Quick Presets:</span>
              <button type="button" className="skill-tag-btn" onClick={() => setDeadlinePreset(3)}>+3 Days</button>
              <button type="button" className="skill-tag-btn" onClick={() => setDeadlinePreset(7)}>+1 Week</button>
              <button type="button" className="skill-tag-btn" onClick={() => setDeadlinePreset(14)}>+2 Weeks</button>
              <button type="button" className="skill-tag-btn" onClick={() => setDeadlinePreset(30)}>+1 Month</button>
            </div>
          </div>

          {/* Balance indicator */}
          {(() => {
            const budget = Number(form.amount) || 0;
            const sufficient = balance >= budget;
            return (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--r-md)',
                background: sufficient ? 'rgba(183, 222, 196, 0.12)' : 'rgba(222, 183, 209, 0.15)',
                border: `1px solid ${sufficient ? 'rgba(183, 222, 196, 0.35)' : 'rgba(222, 183, 209, 0.35)'}`,
                fontSize: '0.85rem',
                marginBottom: '0.5rem',
              }}>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  color: sufficient ? 'var(--clr-accent-h)' : 'var(--clr-primary-d)'
                }}>
                  {sufficient ? <IconCheckCircle size={16} /> : <IconAlert size={16} />}
                  Your wallet balance: <strong>${balance.toFixed(2)}</strong>
                </span>
                {!sufficient && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      background: 'var(--clr-primary)',
                      color: '#1a1c23',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                    onClick={() => navigate('/wallet')}
                  >
                    <IconWallet size={14} /> Top Up Balance
                  </button>
                )}
              </div>
            );
          })()}

          <div className="divider" />

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              id="btn-post-job"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 1, padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {loading
                ? <><span className="spinner" /> Posting…</>
                : <><IconPlus size={16} /> Post Job</>}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostJob;
