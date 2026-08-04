import React from 'react';
import { Link } from 'react-router-dom';
import { IconLogo } from './Icons';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <div className="footer-logo-icon">
              <IconLogo size={16} />
            </div>
            <span className="footer-logo-text">MicroGig</span>
          </div>
          <p className="footer-tagline">
            A trusted micro-freelancing marketplace for seamless project delivery, secure payments, and verified reviews.
          </p>
        </div>

        <div className="footer-nav">
          <div className="footer-col">
            <span className="footer-col-title">Platform</span>
            <Link to="/jobs" className="footer-link">Browse Jobs</Link>
            <Link to="/dashboard" className="footer-link">Dashboard</Link>
            <Link to="/wallet" className="footer-link">Wallet & Payouts</Link>
          </div>

          <div className="footer-col">
            <span className="footer-col-title">Account</span>
            <Link to="/profile" className="footer-link">Profile Settings</Link>
            <Link to="/my-assignments" className="footer-link">My Assignments</Link>
            <Link to="/post-job" className="footer-link">Post a Job</Link>
          </div>

          <div className="footer-col">
            <span className="footer-col-title">Security & Trust</span>
            <span className="footer-static">Escrow Protection</span>
            <span className="footer-static">Verified Reviews</span>
            <span className="footer-static">Instant Settlement</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <span className="footer-copy">
            &copy; {currentYear} MicroGig Platform. All rights reserved.
          </span>
          <div className="footer-status">
            <span className="status-dot"></span>
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
