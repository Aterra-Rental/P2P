import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import "../Global.css";
import defaultAvatar from "../../assets/default-avatar.png";
import { getUserProfile } from "../../lib/profile";


const Dashboard = () => {
  const navigate = useNavigate();

  const [showUploadOptions, setShowUploadOptions] = useState(false);
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
        const data = await getUserProfile();
        setUser(data);
      } catch (err) {
        console.error(err);

        if (err.message.includes("404")) {
          setUser(null);
          return;
        }

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
  const handleRestrictedAction = (path) => {
    if (user.verify_status === "Pending") {
        alert(
            "Your account verification is still pending.\n\nPlease wait for an administrator to review and approve your account before trading."
        );
        return;
    }

    if (user.verify_status === "Rejected") {
        alert(
            "Your verification was rejected.\n\nPlease update your profile and submit it again."
        );
        return;
    }

    navigate(path);
};
  const handleCapturedImage = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      alert("No image selected.");
      return;
    }
    const userId = localStorage.getItem("user_id");
    console.log("User ID:", userId);
    if (!userId) {
      alert("User not logged in.");
      return;
    }

    const formData = new FormData();
    formData.append("profile_picture", file);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/profile/${userId}/picture`,
        {
          method: "PUT",
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || "Upload failed.");
        return;
      }

      const updatedUser = await getUserProfile();
      setUser(updatedUser);

      alert("Profile picture updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    }
  };
  if (loading) {
    return (
      <div className="user-container">
        <h2>Loading...</h2>
      </div>
    );
  }
  if (!user) {
  return (
    <div className="no-profile-container">
      <div className="no-profile-card">

        <div className="no-profile-icon">
          📋
        </div>

        <h2>Complete Your Profile</h2>

        <p>
          Your account has been created successfully.
          <br />
          Before you can use the P2P Escrow platform, you need to complete your personal profile and verify your identity.
        </p>

        <button
          className="complete-profile-btn"
          onClick={() => navigate("/CompleteProfile")}
        >
          Complete Profile
        </button>
                  <button
            className="logout-btn-secondary"
            onClick={handleLogout}
          >
            Logout
          </button>
      </div>
    </div>
  );
}
  return (
    <div className="Global dashboard">
      <header className="dashboard-header">
        <div>
          <h1>P2P</h1>
          <p>
            Welcome back, {user.firstname} {user.lastname}
          </p>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>
      {user.verify_status === "Pending" && (
  <div className="dashboard-banner pending">
    ⏳ Your verification request has been submitted successfully.
    Please wait for an administrator to review your account.
  </div>
)}

{user.verify_status === "Verified" && (
  <div className="dashboard-banner verified">
    ✅ Your account has been verified.
    You can now create and join deal rooms.
  </div>
)}

{user.verify_status === "Rejected" && (
  <div className="dashboard-banner rejected">
    ❌ Your verification was rejected.
    Please update your profile and submit it again.
  </div>
)}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="profile-picture-container">
            <img
              src={
                user.profile_picture
                  ? `http://127.0.0.1:8000/${user.profile_picture}?t=${new Date().getTime()}`
                  : defaultAvatar
              }
              alt="Profile"
              className="profile-picture"
            />

            <div className="upload-buttons">
              {!showUploadOptions ? (
                <button
                  type="button"
                  className="upload-button"
                  onClick={() => setShowUploadOptions(true)}
                >
                  Change Profile Picture
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="upload-button"
                    onClick={() => navigate("/camera/profile")}
                  >
                    Take Photo
                  </button>

                  <button
                    type="button"
                    className="upload-button secondary"
                    onClick={() =>
                      document.getElementById("galleryInput").click()
                    }
                  >
                    Choose from Gallery
                  </button>

                  <button
                    type="button"
                    className="upload-button cancel"
                    onClick={() => setShowUploadOptions(false)}
                  >
                    Cancel
                  </button>
                </>
              )}

              <input
                id="galleryInput"
                type="file"
                accept="image/*"
                hidden
                onChange={handleCapturedImage}
              />
            </div>
          </div>
          <h2>Profile Information</h2>

          <div className="profile-row verification-row">
            <span>First Name</span>
            <strong>{user.firstname}</strong>
          </div>

          <div className="profile-row verification-row">
                <span>Last Name</span>
                <strong>{user.lastname}</strong>
            </div>

            <div className="profile-row verification-row">
                <span>Username</span>
                <strong>@{user.username}</strong>
            </div>

            <div className="profile-row verification-row">
                <span>Phone Number</span>
                <strong>{user.phonenumber}</strong>
          </div>

          <div className="profile-row verification-row">
            <span>National ID</span>
            <strong>{user.nationalidentity_id}</strong>
          </div>

          <div className="profile-row verification-row">
            <span>Date of Birth</span>
            <strong>{user.dob}</strong>
          </div>

          <div className="profile-row verification-row">
            <span>Address</span>
            <strong>{user.address}</strong>
          </div>


          <div className="profile-row verification-row">
            <span>Verification</span>

            <button
    type="button"
    className={`status ${(user.verify_status || "").toLowerCase()}`}
    onClick={() => {

        if (user.verify_status === "Pending") {
            alert(
                "Your verification request has been submitted successfully.\n\nPlease wait for an administrator to review your account."
            );
        }

        if (user.verify_status === "Rejected") {
            alert(
                "Your verification was rejected.\n\nPlease update your profile and submit it again."
            );
        }

        if (user.verify_status === "Verified") {
            alert(
                "Your account is verified and ready to trade."
            );
        }

    }}
>
    {user.verify_status}
</button>
          </div>

                 <button
            className="action-btn primary"
            onClick={() => navigate("/settings")}
        >
            ⚙ Account Settings
        </button>

      </div>

      <div className="dashboard-card">

        <h2>Quick Actions</h2>

        <button
            className="action-btn primary"
            onClick={() => handleRestrictedAction("/create-deal")}
        >
            + Create Room
        </button>

        <div className="action-grid">

            <button
                className="action-btn"
                onClick={() => handleRestrictedAction("/transactions")}
            >
                📜 Transaction History
            </button>

            <button
                className="action-btn"
                onClick={() => alert("Notifications page is coming soon.")}
            >
                🔔 Notifications
            </button>

            <button
                className="action-btn"
                onClick={() => alert("Wallet page is coming soon.")}
            >
                💳 Wallet
            </button>

        </div>

        <div className="verification-message">

            {user.verify_status === "Pending" && (
                <p className="pending-text">
                    🟡 Your profile has been submitted successfully.
                    <br />
                    Please wait for an administrator to review and approve your account.
                </p>
            )}

            {user.verify_status === "Rejected" && (
                <>
                    <p className="rejected-text">
                        🔴 Your verification was rejected.
                        <br />
                        Please update your profile and submit it again.
                    </p>

                    <button
                        className="action-btn warning"
                        onClick={() => navigate("/CompleteProfile")}
                    >
                        Update Profile
                    </button>
                </>
            )}

            {user.verify_status === "Verified" && (
                <p className="verified-text">
                    🟢 Your account has been verified.
                    All trading features are available.
                </p>
            )}

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
