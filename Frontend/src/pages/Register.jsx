import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flame } from "lucide-react";
import "./Auth.css";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      alert("Registration Successful!");

      navigate("/Login");
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="AuthPage">
      <div className="AuthCard">

        <div className="AuthLogo">
          <div className="AuthLogoIcon">
            <Flame size={30} />
          </div>
          <span className="AuthLogoText">P2P</span>
        </div>

        <h1>Create Account</h1>

        <p className="AuthSubtitle">
          Register a new account to start using the P2P escrow platform.
        </p>

        <form onSubmit={handleSubmit}>

          <div className="InputGroup">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="InputGroup">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="InputGroup">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Register"}
          </button>

        </form>

        <div className="switchLink">
          Already have an account?
          <Link to="/Login">Login</Link>
        </div>

        <div className="backHome">
          <Link to="/Home">← Back to Home</Link>
        </div>

      </div>
    </div>
  );
};

export default Register;