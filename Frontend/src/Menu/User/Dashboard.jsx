import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import "../Global.css";
import defaultAvatar from "../../assets/default-avatar.png";
import { showTopNotification } from "../../lib/notification";
import { useAuth } from "../../components/AuthContext"
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, logout, refreshUser } = useAuth();
  const [showUploadOptions, setShowUploadOptions] = useState(false);

  const handleLogout = () => {
  logout();

  navigate("/Login", {
    replace: true,
  });
};
  
  const handleCapturedImage = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      showTopNotification(
  "No image was selected.",
  "warning"
);
      return;
    }
    const userId = localStorage.getItem("user_id");
    console.log("User ID:", userId);
    if (!userId) {
      showTopNotification(
  "Please sign in before updating the profile picture.",
  "warning"
);
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
        showTopNotification(
  result.message || "The profile picture could not be uploaded.",
  "error"
);
        return;
      }

       await refreshUser();

      showTopNotification(
  "Profile picture updated successfully.",
  "success"
);
    } catch (err) {
      console.error(err);
      showTopNotification(
  "The profile picture could not be uploaded.",
  "error"
);
    }
  };
  if (loading) {
    return (
      <div className="user-container">
        <h2>Loading...</h2>
      </div>
    );
  }
  if (!user?.profile_completed) {
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
    showTopNotification(
      "The account is currently being reviewed. Please wait for administrator approval.",
      "warning",
      5000
    );
  }

  if (user.verify_status === "Rejected") {
    showTopNotification(
      "The profile was rejected. Please correct the submitted information and resubmit it.",
      "error",
      5000
    );
  }

  if (user.verify_status === "Verified") {
    showTopNotification(
      "The account is verified and ready to trade.",
      "success"
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
