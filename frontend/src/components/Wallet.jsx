import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from './Toast';
import { IconWallet, IconAlert, IconArrowUpRight, IconClose, IconCreditCard, IconArrowDownLeft } from './Icons';

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

const txBadgeClass = (type) => {
  switch (type) {
    case 'TOPUP':      return 'tx-badge-topup';
    case 'PAYMENT':    return 'tx-badge-payment';
    case 'DEBIT':      return 'tx-badge-debit';
    case 'WITHDRAWAL': return 'tx-badge-debit';
    case 'PENALTY':    return 'tx-badge-penalty';
    default:           return 'tx-badge-default';
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Wallet = ({ user, setUser }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const isClient = user?.role === 'ROLE_CLIENT';
  const isFreelancer = user?.role === 'ROLE_FREELANCER';

  const [amount, setAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  // Withdrawal state
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('Bank Transfer');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const balance = Number(user?.balance ?? 0);

  useEffect(() => {
    fetchTransactions();
    refreshBalance();
  }, []);

  const refreshBalance = async () => {
    try {
      const res = await api.get('/user/me');
      if (res.data && res.data.balance !== undefined) {
        const updated = { ...user, balance: res.data.balance };
        localStorage.setItem('user', JSON.stringify(updated));
        if (setUser) setUser(updated);
      }
    } catch {
      // Non-critical
    }
  };

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const res = await api.get('/user/transactions');
      setTransactions(res.data);
    } catch {
      // Non-critical if user has no transactions
    } finally {
      setTxLoading(false);
    }
  };

  const handleTopUp = async (e) => {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) { setError('Enter a valid amount greater than $0'); return; }
    if (val > 10000)      { setError('Maximum top-up is $10,000 per transaction'); return; }
    setError('');
    setTopupLoading(true);

    try {
      const res = await api.post('/user/topup', { amount: val });
      const newBalance = res.data.balance;

      const updatedUser = { ...user, balance: newBalance };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      toast.success(`$${val.toFixed(2)} added to your wallet successfully`);
      setAmount('');
      fetchTransactions();
    } catch (err) {
      const msg = err.response?.data || 'Top-up failed. Please try again.';
      toast.error(typeof msg === 'string' ? msg : 'Top-up failed.');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const val = Number(withdrawAmount);
    if (!val || val <= 0) {
      setWithdrawError('Enter a valid amount greater than $0');
      return;
    }
    if (val > balance) {
      setWithdrawError(`Amount exceeds your balance of $${balance.toFixed(2)}`);
      return;
    }
    if (!withdrawAccount.trim()) {
      setWithdrawError('Please enter your payout destination (account number or email)');
      return;
    }

    setWithdrawError('');
    setWithdrawLoading(true);

    try {
      const res = await api.post('/user/withdraw', {
        amount: val,
        method: withdrawMethod,
        accountDetails: withdrawAccount,
      });

      const newBalance = res.data.balance;
      const updatedUser = { ...user, balance: newBalance };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      toast.success(`$${val.toFixed(2)} payout processed via ${withdrawMethod}`);
      setWithdrawModalOpen(false);
      setWithdrawAmount('');
      setWithdrawAccount('');
      fetchTransactions();
    } catch (err) {
      const msg = err.response?.data || 'Withdrawal failed. Please try again.';
      toast.error(typeof msg === 'string' ? msg : 'Withdrawal failed.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="page-content" style={{ animation: 'fadeSlideUp 0.3s ease' }}>
      {/* Header */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <h1>{isClient ? 'Wallet & Funds' : 'Earnings & Ledger'}</h1>
        </div>
        <p>{isClient ? 'Manage your balance, add funds, and view payment history' : 'Track your earnings payouts, request withdrawals, and view transaction records'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isClient ? '1fr 380px' : '1fr 380px', gap: '1.5rem', alignItems: 'start', marginBottom: '2rem' }}>

        {/* Balance Card */}
        <div className="form-card">
          <div style={{
            background: 'var(--grad-brand)',
            borderRadius: 'var(--r-lg)',
            padding: '2rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            color: 'white',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.12)',
              borderRadius: 'var(--r-lg)',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9, marginBottom: '0.5rem' }}>
                {isClient ? 'Available Wallet Balance' : 'Total Earnings Balance'}
              </div>
              <div style={{ fontSize: '3.25rem', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1 }}>
                ${balance.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.5rem' }}>
                {user?.fullName ? `${user.fullName} (@${user.username})` : `@${user?.username}`} • {isClient ? 'Client Account' : 'Freelancer Account'}
              </div>

              {/* Withdraw Button */}
              <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button
                  id="btn-withdraw-funds"
                  className="btn btn-sm"
                  style={{
                    background: balance > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)',
                    color: balance > 0 ? '#0F172A' : 'rgba(255, 255, 255, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    fontWeight: 700,
                    cursor: balance > 0 ? 'pointer' : 'not-allowed',
                    boxShadow: balance > 0 ? '0 4px 14px rgba(0, 0, 0, 0.25)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onClick={() => setWithdrawModalOpen(true)}
                  disabled={balance <= 0}
                >
                  <IconArrowUpRight size={14} /> Withdraw Funds
                </button>
              </div>
            </div>
          </div>

          {/* Top-up Form (Only for Clients) */}
          {isClient && (
            <form onSubmit={handleTopUp} noValidate>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Top Up Funds</h3>

              {/* Quick Amount Buttons */}
              <div className="form-group">
                <label className="form-label">Quick Amount</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {QUICK_AMOUNTS.map(q => (
                    <button
                      key={q}
                      type="button"
                      id={`quick-${q}`}
                      className={`btn btn-ghost btn-sm ${Number(amount) === q ? 'btn-secondary' : ''}`}
                      style={{
                        borderColor: Number(amount) === q ? 'var(--clr-primary)' : undefined,
                        color: Number(amount) === q ? 'var(--clr-primary-h)' : undefined,
                      }}
                      onClick={() => { setAmount(String(q)); setError(''); }}
                    >
                      ${q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div className="form-group">
                <label className="form-label" htmlFor="topup-amount">Or enter custom amount</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--clr-text-3)', fontWeight: 600
                  }}>$</span>
                  <input
                    id="topup-amount"
                    className={`form-input ${error ? 'error' : ''}`}
                    type="number"
                    min="1"
                    max="10000"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setError(''); }}
                    style={{ paddingLeft: '1.75rem' }}
                  />
                </div>
                {error && <span className="form-error">{error}</span>}
              </div>

              <button
                id="btn-topup-submit"
                type="submit"
                className="btn btn-primary btn-full"
                style={{ marginTop: '0.5rem', padding: '0.85rem' }}
                disabled={topupLoading || !amount}
              >
                {topupLoading
                  ? <><span className="spinner" /> Processing…</>
                  : `Add $${Number(amount) > 0 ? Number(amount).toFixed(2) : '0.00'} to Wallet`}
              </button>
            </form>
          )}

          {/* Freelancer Payout Overview */}
          {isFreelancer && (
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>Instant Payouts</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', lineHeight: 1.6 }}>
                You can withdraw your completed job earnings directly to your verified bank account, PayPal, or Stripe. Withdrawals are processed instantly into your transaction ledger.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="preview-card">
            <h3>{isClient ? 'Payment & Escrow Rules' : 'Payout & Earnings Info'}</h3>
            <ul style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', paddingLeft: '1.25rem', lineHeight: 2 }}>
              {isClient ? (
                <>
                  <li>Top up balance prior to posting job requests</li>
                  <li>Budget is validated when posting new jobs</li>
                  <li>Approving completed deliverables instantly releases escrow funds</li>
                  <li>All transaction events are recorded in the ledger</li>
                </>
              ) : (
                <>
                  <li>Earnings are credited immediately upon client project approval</li>
                  <li>Zero platform fees on standard micro-gig payouts</li>
                  <li>Supports Bank Wire, PayPal, and Stripe accounts</li>
                  <li>Track all withdrawal history in the audit ledger</li>
                </>
              )}
            </ul>
          </div>

          {isClient && balance < 10 && (
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 'var(--r-md)',
              padding: '1rem',
              fontSize: '0.85rem',
              color: 'var(--clr-warning)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <IconAlert size={16} />
              <span>Your balance is low (${balance.toFixed(2)}). Top up before creating new jobs.</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── TRANSACTION HISTORY TABLE ─── */}
      <div className="form-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Transaction History & Ledger</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', margin: 0 }}>
              Full log of all deposits, payments released, payouts received, and withdrawals
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchTransactions} disabled={txLoading}>
            {txLoading ? <span className="spinner" /> : '↻'} Refresh Ledger
          </button>
        </div>

        {txLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <div className="empty-state-icon">
              <IconWallet size={44} />
            </div>
            <h3>No transactions yet</h3>
            <p>Your financial transactions will appear here once you add funds, withdraw, or complete work.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const numAmount = Number(tx.amount);
                  const isPositive = numAmount > 0 && tx.type !== 'PENALTY' && tx.type !== 'WITHDRAWAL';
                  return (
                    <tr key={tx.id}>
                      <td style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', whiteSpace: 'nowrap' }}>
                        {formatDate(tx.createdAt)}
                      </td>
                      <td>
                        <span className={`badge ${txBadgeClass(tx.type)}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.9rem' }}>
                        {tx.description || (
                          tx.type === 'TOPUP' ? 'Wallet Top-up' :
                          tx.type === 'PAYMENT' ? 'Job Payout' :
                          tx.type === 'DEBIT' ? 'Job Payment' :
                          tx.type === 'WITHDRAWAL' ? 'Funds Withdrawal' : 'Penalty'
                        )}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: isPositive ? 'var(--clr-success)' : 'var(--clr-error)',
                        whiteSpace: 'nowrap',
                      }}>
                        {isPositive ? `+ $${Math.abs(numAmount).toFixed(2)}` : `- $${Math.abs(numAmount).toFixed(2)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── WITHDRAWAL MODAL ─── */}
      {withdrawModalOpen && (
        <div className="modal-overlay" onClick={() => setWithdrawModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Withdraw Funds</h3>
              <button className="modal-close-btn" onClick={() => setWithdrawModalOpen(false)}><IconClose size={16} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '1.25rem' }}>
              Transfer your available balance (${balance.toFixed(2)}) to your external payment account.
            </p>

            <form onSubmit={handleWithdraw}>
              {/* Amount input */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Withdrawal Amount (USD) *</label>
                  <button
                    type="button"
                    style={{ fontSize: '0.75rem', color: 'var(--clr-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => { setWithdrawAmount(String(balance)); setWithdrawError(''); }}
                  >
                    Max (${balance.toFixed(2)})
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--clr-text-3)', fontWeight: 600
                  }}>$</span>
                  <input
                    type="number"
                    min="1"
                    max={balance}
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="form-input"
                    value={withdrawAmount}
                    onChange={e => { setWithdrawAmount(e.target.value); setWithdrawError(''); }}
                    style={{ paddingLeft: '1.75rem' }}
                  />
                </div>
              </div>

              {/* Method Selector */}
              <div className="form-group">
                <label className="form-label">Payout Method *</label>
                <select
                  className="form-input"
                  value={withdrawMethod}
                  onChange={e => setWithdrawMethod(e.target.value)}
                >
                  <option value="Bank Transfer">Direct Bank Wire / Transfer</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Stripe">Stripe Express</option>
                </select>
              </div>

              {/* Account Identifier */}
              <div className="form-group">
                <label className="form-label">
                  {withdrawMethod === 'PayPal' ? 'PayPal Email Address *' :
                   withdrawMethod === 'Stripe' ? 'Stripe Account / Email *' :
                   'Bank Account / IBAN Number *'}
                </label>
                <input
                  type={withdrawMethod === 'PayPal' || withdrawMethod === 'Stripe' ? 'email' : 'text'}
                  required
                  placeholder={withdrawMethod === 'PayPal' ? 'user@paypal.com' :
                               withdrawMethod === 'Stripe' ? 'user@stripe.com' :
                               'US89 3704 0044 0532 0130 00'}
                  className="form-input"
                  value={withdrawAccount}
                  onChange={e => { setWithdrawAccount(e.target.value); setWithdrawError(''); }}
                />
              </div>

              {withdrawError && (
                <div style={{ fontSize: '0.8rem', color: 'var(--clr-error)', marginBottom: '0.75rem' }}>
                  {withdrawError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setWithdrawModalOpen(false)}
                  disabled={withdrawLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={withdrawLoading || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > balance}
                >
                  {withdrawLoading ? <><span className="spinner" /> Processing…</> : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
