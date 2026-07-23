import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import "../Global.css";

const Dashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");

    if (!userId) {
      navigate("/Login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/profile/${userId}`
        );

        if (response.status === 404) {
          navigate("/CompleteProfile");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error(err);
        alert("Unable to load your profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/Login");
  };

  if (loading) {
    return (
      <div className="user-container">
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
  <div className="Global dashboard">

    <header className="dashboard-header">
      <div>
        <h1>P2P</h1>
        <p>Welcome back, {user.firstname} {user.lastname}</p>
      </div>

      <button
        className="logout-btn"
        onClick={handleLogout}
      >
        Logout
      </button>
    </header>

    <div className="dashboard-grid">

      <div className="dashboard-card">
        <h2>Profile Information</h2>

        <div className="profile-row">
          <span>First Name</span>
          <strong>{user.firstname}</strong>
        </div>

        <div className="profile-row">
          <span>Last Name</span>
          <strong>{user.lastname}</strong>
        </div>

        <div className="profile-row">
          <span>Phone Number</span>
          <strong>{user.phonenumber}</strong>
        </div>

        <div className="profile-row">
          <span>National ID</span>
          <strong>{user.nationalidentity_id}</strong>
        </div>

        <div className="profile-row">
          <span>Date of Birth</span>
          <strong>{user.dob}</strong>
        </div>

        <div className="profile-row">
          <span>Address</span>
          <strong>{user.address}</strong>
        </div>

        <div className="profile-row">
          <span>Verification</span>

          <span className={`status ${user.verify_status.toLowerCase()}`}>
            {user.verify_status}
          </span>
        </div>
      </div>

      <div className="dashboard-card">

        <h2>Quick Actions</h2>

        <button className="action-btn primary">
          + Create Room
        </button>

        <div className="action-grid">

          <button className="action-btn">
            Browse Rooms
          </button>

          <button className="action-btn">
            My Rooms
          </button>

          <button className="action-btn">
            Transactions
          </button>

        </div>

      </div>

      <div className="dashboard-card">

        <h2>Statistics</h2>

        <div className="stats">

          <div className="stat-box">
            <h3>0</h3>
            <p>Active Rooms</p>
          </div>

          <div className="stat-box">
            <h3>0</h3>
            <p>Completed Deals</p>
          </div>

          <div className="stat-box">
            <h3>0</h3>
            <p>Pending Deals</p>
          </div>

        </div>

      </div>

      <div className="dashboard-card">

        <h2>Recent Activity</h2>

        <p>No activity yet.</p>

      </div>

    </div>

  </div>

  );
};

export default Dashboard;