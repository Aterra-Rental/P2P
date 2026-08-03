import React from 'react'
import { NavLink } from 'react-router-dom'
import { Flame } from 'lucide-react'
import './Footer.css'

const Footer = () => {
  return (
    <div className='Global'>
      <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <NavLink to="/" className="footer-brand-link">
            <div className="footer-brand-icon">
              <Flame size={16} />
            </div>
            <span className="footer-brand-text">P2P</span>
          </NavLink>
          <p className="footer-tagline">
            Trade directly with real people — bot-mediated rooms, escrow-protected
            payments, and admins watching your back.
          </p>
        </div>

        <div className="footer-columns">
          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><NavLink to="/Home">Home</NavLink></li>
              <li><NavLink to="/Feature">Feature</NavLink></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Support</h4>
            <ul>
              <li><NavLink to="/FQA">FAQ</NavLink></li>
              <li><NavLink to="/FQA">Report an Issue</NavLink></li>
              <li><a href="#">Contact Admins</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><NavLink to="/privacy-policy">Privacy Policy</NavLink></li>
              <li><NavLink to="/terms-of-service">Terms of Service</NavLink></li>
              <li><NavLink to="/status">Status</NavLink></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-copyright">© 2026 P2P. All rights reserved.</span>
      </div>
    </footer>
    </div>
    
  )
}

export default Footer