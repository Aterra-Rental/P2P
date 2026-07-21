// import React, { useState } from 'react'
// import './Auth.css'
// import { useNavigate, Link } from 'react-router-dom'

// const Login = () => {
//   const [username, setUsername] = useState('')
//   const [password, setPassword] = useState('')
//   const [error, setError] = useState('')
//   const navigate = useNavigate()

//   const handleSubmit = async (e) => {
//     e.preventDefault()
//     setError('')

//     const res = await fetch('/api/login/', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ username, password })
//     })

//     const data = await res.json()

//     if (!res.ok) {
//       setError(data.error || 'login failed')
//       return
//     }

//     localStorage.setItem('token', data.token)
//     navigate('/User')
//   }

//   return (
//     <div className='AuthPage'>
//       <div className='AuthCard'>
//         <h1>Login</h1>
//         <form onSubmit={handleSubmit}>
//           <input placeholder='Username' value={username} onChange={e => setUsername(e.target.value)} />
//           <input type='password' placeholder='Password' value={password} onChange={e => setPassword(e.target.value)} />
//           {error && <p className='error'>{error}</p>}
//           <button type='submit'>Login</button>
//         </form>
//         <p className='switchLink'>No account? <Link to='/Register'>Register</Link></p>
//       </div>
//     </div>
//   )
// }

// export default Login
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
import { Flame } from "lucide-react";
const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);

      navigate("/User");
    } catch (err) {
      setError("Unable to connect to the server.");
    }

    setLoading(false);
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

        <h1>Welcome Back</h1>

        <p className="AuthSubtitle">
          Sign in to continue using your P2P account.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="InputGroup">
            <label>Email</label>

            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="InputGroup">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Login"}
          </button>
        </form>

        <div className="switchLink">
          Don't have an account?
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
