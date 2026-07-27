import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flame } from "lucide-react";
import "./Auth.css";

const Login = () => {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

    setLoading(true);
    setError("");

    try {

      const response = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      try {

        // Check whether the user has completed their profile
        const profileResponse = await fetch(
          `http://127.0.0.1:8000/api/profile/${data.user_id}`
        );

        if (profileResponse.ok) {

          const profile = await profileResponse.json();
          console.log("PROFILE FROM API:", profile);

const userObject = {
    user_id: data.user_id,
    email: data.email,
    firstname: profile.firstname,
    lastname: profile.lastname,
    verify_status: profile.verify_status,
};

console.log("Saving user:", userObject);

localStorage.setItem("user", JSON.stringify(userObject));

console.log(
    "Stored user:",
    JSON.parse(localStorage.getItem("user"))
);

          // Store complete user object
          localStorage.setItem(
            "user",
            JSON.stringify({
              user_id: data.user_id,
              email: data.email,
              firstname: profile.firstname,
              lastname: profile.lastname,
              verify_status: profile.verify_status,
            })
          );

          // Keep old storage for compatibility
          localStorage.setItem("user_id", data.user_id);
          localStorage.setItem("email", data.email);

          alert("Login Successful!");
          navigate("/Dashboard");

        } else if (profileResponse.status === 404) {

          // User exists but has not completed profile yet
          localStorage.setItem(
            "user",
            JSON.stringify({
              user_id: data.user_id,
              email: data.email,
              verify_status: null,
            })
          );

          localStorage.setItem("user_id", data.user_id);
          localStorage.setItem("email", data.email);

          alert("Please complete your profile first.");
          navigate("/CompleteProfile");

        } else {

          setError("Unable to verify your profile.");

        }

      } catch (err) {

        console.error(err);
        setError("Unable to connect to the server.");

      }

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

          <span className="AuthLogoText">
            P2P
          </span>
        </div>

        <h1>Welcome Back</h1>

        <p className="AuthSubtitle">
          Sign in to continue using your P2P account.
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
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />

          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Login"}
          </button>

        </form>

        <div className="switchLink">
          Don't have an account?{" "}
          <Link to="/Register">Register</Link>
        </div>

        <div className="backHome">
          <Link to="/Home">← Back to Home</Link>
        </div>

      </div>

    </div>
  );

};

export default Login;