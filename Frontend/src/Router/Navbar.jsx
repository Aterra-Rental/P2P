import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Flame } from "lucide-react";
import "./Navbar.css";
import { getUserProfile } from "../lib/profile";
import NotificationBell from '../Menu/NotificationBell';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const isLoggedIn = Boolean(
    localStorage.getItem("token")
    && localStorage.getItem("user_id")
  );
  const closeMenu = () => {
    const toggle = document.getElementById("nav-toggle");
    if (toggle) toggle.checked = false;
  };
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await getUserProfile();

        if (data) {
          setUser(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadUser();
  }, []);

  return (
    <nav className="navbar" aria-label="Primary Navigation">
      <div className="nav_inner">
        <div className="brand">
          <NavLink to="/Home" className="footer-brand-link" onClick={closeMenu}>
            <div className="footer-brand-icon">
              <Flame size={18} />
            </div>

            <span className="footer-brand-text">P2P</span>
          </NavLink>
        </div>

        {/* ===== Mobile Toggle ===== */}
        <input
          type="checkbox"
          id="nav-toggle"
          className="toggle"
          aria-controls="primary-menu"
        />

        <label
          htmlFor="nav-toggle"
          className="toggle-label"
          aria-label="Toggle navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </label>

        {/* ===== Navigation ===== */}
        <ul id="primary-menu" className="menu">
          <li>
            <NavLink to="/Home" className="navlink" onClick={closeMenu}>
              Home
            </NavLink>
          </li>

          <li>
            <NavLink to="/Feature" className="navlink" onClick={closeMenu}>
              Features
            </NavLink>
          </li>

          <li>
            <NavLink to="/FQA" className="navlink" onClick={closeMenu}>
              FAQ
            </NavLink>
          </li>

          <li>
            <NavLink to="/Dashboard" className="navlink" onClick={closeMenu}>
              {user ? user.firstname : "Dashboard"}
            </NavLink>
          </li>
        </ul>

        {isLoggedIn && (
          <div className="nav-bell-slot">
            <NotificationBell />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;