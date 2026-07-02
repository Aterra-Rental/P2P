import React, { useState } from 'react'
import './Auth.css'
import { useNavigate, Link } from 'react-router-dom'

const Register = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'registration failed')
      return
    }

    localStorage.setItem('token', data.token)
    navigate('/User')
  }

  return (
    <div className='AuthPage'>
      <div className='AuthCard'>
        <h1>Register</h1>
        <form onSubmit={handleSubmit}>
          <input placeholder='Username' value={username} onChange={e => setUsername(e.target.value)} />
          <input placeholder='Email' value={email} onChange={e => setEmail(e.target.value)} />
          <input type='password' placeholder='Password' value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p className='error'>{error}</p>}
          <button type='submit'>Register</button>
        </form>
        <p className='switchLink'>Already have an account? <Link to='/Login'>Login</Link></p>
      </div>
    </div>
  )
}

export default Register