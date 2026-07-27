import { useState } from "react";
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

      const response = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.email.split("@")[0],
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || "Login failed.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);

      alert("Login Successful!");
      navigate("/Dashboard");

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