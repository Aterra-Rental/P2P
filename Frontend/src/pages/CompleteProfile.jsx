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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user_id = localStorage.getItem("user_id");

    if (!user_id) {
      alert("Please login first.");
      navigate("/login");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id,
          firstname,
          lastname,
          phonenumber,
          nationalidentity_id: nationalidentityId,
          dob,
          address,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Profile completed successfully!");
        navigate("/User");
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

          <div className="InputGroup">
            <label>First Name</label>
            <input
              type="text"
              placeholder="Enter first name"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              required
            />
          </div>

          <div className="InputGroup">
            <label>Last Name</label>
            <input
              type="text"
              placeholder="Enter last name"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              required
            />
          </div>

          <div className="InputGroup">
            <label>Phone Number</label>
            <input
              type="text"
              placeholder="012345678"
              value={phonenumber}
              onChange={(e) => setPhonenumber(e.target.value)}
              required
            />
          </div>

          <div className="InputGroup">
            <label>National ID</label>
            <input
              type="text"
              placeholder="Enter National ID"
              value={nationalidentityId}
              onChange={(e) => setNationalidentityId(e.target.value)}
              required
            />
          </div>

          <div className="InputGroup">
            <label>Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </div>

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