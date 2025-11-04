import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.module.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Proposals', path: '/proposals' },
      { label: 'Create Proposal', path: '/create-proposal' },
      { label: 'Dashboard', path: '/dashboard' }
    ],
    resources: [
      { label: 'Documentation', path: '#' },
      { label: 'GitHub', path: '#' },
      { label: 'Discord', path: '#' }
    ],
    legal: [
      { label: 'Terms of Service', path: '#' },
      { label: 'Privacy Policy', path: '#' }
    ]
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Footer Top */}
        <div className="footer-top">
          {/* Brand Section */}
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="logo-icon">🗳️</div>
              <span className="logo-text">DAO Voting</span>
            </div>
            <p className="footer-description">
              Decentralized governance made simple. Create proposals, vote, and shape the future of your DAO.
            </p>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="Twitter">
                <span>𝕏</span>
              </a>
              <a href="#" className="social-link" aria-label="Discord">
                <span>💬</span>
              </a>
              <a href="#" className="social-link" aria-label="GitHub">
                <span>⚙️</span>
              </a>
            </div>
          </div>

          {/* Links Sections */}
          <div className="footer-links">
            <div className="footer-link-group">
              <h3 className="footer-link-title">Product</h3>
              {footerLinks.product.map((link) => (
                <Link key={link.label} to={link.path} className="footer-link">
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="footer-link-group">
              <h3 className="footer-link-title">Resources</h3>
              {footerLinks.resources.map((link) => (
                <a key={link.label} href={link.path} className="footer-link">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="footer-link-group">
              <h3 className="footer-link-title">Legal</h3>
              {footerLinks.legal.map((link) => (
                <a key={link.label} href={link.path} className="footer-link">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} DAO Voting. All rights reserved.
          </p>
          <p className="footer-made-with">
            Built with ❤️ for decentralized communities
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;