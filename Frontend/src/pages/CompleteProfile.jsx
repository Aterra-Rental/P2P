import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame } from "lucide-react";
import "./CompleteProfile.css";

const CompleteProfile = () => {
  const navigate = useNavigate();

  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [phonenumber, setPhonenumber] = useState("");
  const [nationalidentityId, setNationalidentityId] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");

  const [nationalIdFront, setNationalIdFront] = useState(null);
  const [nationalIdBack, setNationalIdBack] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user_id = localStorage.getItem("user_id");

    if (!user_id) {
      alert("Please login first.");
      navigate("/login");
      return;
    }

    // -----------------------------
    // Frontend Validation
    // -----------------------------

    const nameRegex = /^[A-Za-z\s]{2,50}$/;
    const phoneRegex = /^\d{8,9}$/;
    const nationalIdRegex = /^\d{9}$/;

    if (!nameRegex.test(firstname.trim())) {
      alert("First name must contain at least 2 letters.");
      return;
    }

    if (!nameRegex.test(lastname.trim())) {
      alert("Last name must contain at least 2 letters.");
      return;
    }

    if (!phoneRegex.test(phonenumber)) {
      alert("Phone number must contain 8 or 9 digits.");
      return;
    }

    if (!nationalIdRegex.test(nationalidentityId)) {
      alert("National ID must contain exactly 9 digits.");
      return;
    }

    if (address.trim().length < 5) {
      alert("Address must be at least 5 characters.");
      return;
    }

    if (!nationalIdFront) {
      alert("Please upload the FRONT of your National ID.");
      return;
    }

    if (!nationalIdBack) {
      alert("Please upload the BACK of your National ID.");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("user_id", user_id);
      formData.append("firstname", firstname.trim());
      formData.append("lastname", lastname.trim());
      formData.append("phonenumber", phonenumber);
      formData.append("nationalidentity_id", nationalidentityId);
      formData.append("dob", dob);
      formData.append("address", address.trim());
      formData.append("national_id_front", nationalIdFront);
      formData.append("national_id_back", nationalIdBack);

      const response = await fetch(
        "http://127.0.0.1:8000/api/profile",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Profile completed successfully!");
        navigate("/Dashboard");
      } else {
        alert(data.message || "Failed to create profile.");
      }
    } catch (error) {
      console.error(error);
      alert("Cannot connect to the server.");
    }
  };

  return (
    <div className="AuthPage">
      <div className="AuthCard">
        <div className="AuthLogo">
          <div className="AuthLogoIcon">
            <Flame size={30} />
          </div>

          <div className="AuthLogoText">
            <h2>P2P ESCROW</h2>
            <span>Complete Your Profile</span>
          </div>
        </div>

        <h1>Personal Information</h1>

        <p className="AuthSubtitle">
          Please complete your personal information before using the platform.
        </p>

        <form onSubmit={handleSubmit}>

          {/* First Name */}
          <div className="InputGroup">
            <label>First Name</label>
            <input
              type="text"
              placeholder="Enter first name"
              value={firstname}
              maxLength={50}
              onChange={(e) =>
                setFirstname(e.target.value.replace(/[^A-Za-z\s]/g, ""))
              }
              required
            />
          </div>

          {/* Last Name */}
          <div className="InputGroup">
            <label>Last Name</label>
            <input
              type="text"
              placeholder="Enter last name"
              value={lastname}
              maxLength={50}
              onChange={(e) =>
                setLastname(e.target.value.replace(/[^A-Za-z\s]/g, ""))
              }
              required
            />
          </div>

          {/* Phone Number */}
          <div className="InputGroup">
            <label>Phone Number</label>

            <div className="input-group">
              <span className="input-group-text">+855</span>

              <input
                type="text"
                className="form-control"
                placeholder="971234567"
                value={phonenumber}
                maxLength={9}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 9) {
                    setPhonenumber(value);
                  }
                }}
                required
              />
            </div>
          </div>

          {/* National ID */}
          <div className="InputGroup">
            <label>National ID</label>

            <input
              type="text"
              placeholder="Enter National ID"
              value={nationalidentityId}
              maxLength={9}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 9) {
                  setNationalidentityId(value);
                }
              }}
              required
            />
          </div>

          {/* National ID Front */}
          <div className="InputGroup">
            <label>National ID (Front)</label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => setNationalIdFront(e.target.files[0])}
              required
            />
          </div>

          {/* National ID Back */}
          <div className="InputGroup">
            <label>National ID (Back)</label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => setNationalIdBack(e.target.files[0])}
              required
            />
          </div>

          {/* Date of Birth */}
          <div className="InputGroup">
            <label>Date of Birth</label>

            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </div>

          {/* Address */}
          <div className="InputGroup">
            <label>Address</label>

            <textarea
              rows="3"
              placeholder="Enter your address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <button className="PrimaryButton" type="submit">
            Complete Profile
          </button>

        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;