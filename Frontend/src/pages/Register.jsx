// import React, { useState } from 'react'
// import './Auth.css'
// import { useNavigate, Link } from 'react-router-dom'

// const Register = () => {
//   const [username, setUsername] = useState('')
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [error, setError] = useState('')
//   const navigate = useNavigate()

//   const handleSubmit = async (e) => {
//     e.preventDefault()
//     setError('')

//     const res = await fetch('/api/register/', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ username, email, password })
//     })

//     const data = await res.json()

//     if (!res.ok) {
//       setError(data.error || 'registration failed')
//       return
//     }

//     localStorage.setItem('token', data.token)
//     navigate('/User')
//   }

//   return (
//     <div className='AuthPage'>
//       <div className='AuthCard'>
//         <h1>Register</h1>
//         <form onSubmit={handleSubmit}>
//           <input placeholder='Username' value={username} onChange={e => setUsername(e.target.value)} />
//           <input placeholder='Email' value={email} onChange={e => setEmail(e.target.value)} />
//           <input type='password' placeholder='Password' value={password} onChange={e => setPassword(e.target.value)} />
//           {error && <p className='error'>{error}</p>}
//           <button type='submit'>Register</button>
//         </form>
//         <p className='switchLink'>Already have an account? <Link to='/Login'>Login</Link></p>
//       </div>
//     </div>
//   )
// }

// export default Register
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
import { Flame } from "lucide-react";
const Register = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
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

        <h1>Create Account</h1>

        <p className="AuthSubtitle">
          Create your secure P2P account to start trading safely.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="InputGroup">
            <label>Username</label>

            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
