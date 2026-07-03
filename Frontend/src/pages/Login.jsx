import React, { useState } from 'react'
import './Auth.css'
import { useNavigate, Link } from 'react-router-dom'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'login failed')
      return
    }

    localStorage.setItem('token', data.token)
    navigate('/User')
  }

  return (
    <div className='AuthPage'>
      <div className='AuthCard'>
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <input placeholder='Username' value={username} onChange={e => setUsername(e.target.value)} />
          <input type='password' placeholder='Password' value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p className='error'>{error}</p>}
          <button type='submit'>Login</button>
        </form>
        <p className='switchLink'>No account? <Link to='/Register'>Register</Link></p>
      </div>
    </div>
  )
}

export default Login