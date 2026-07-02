import React, { useState } from 'react'
import '../Menu/Global.css'
import { useNavigate } from 'react-router-dom'

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
    navigate('/user')
  }

  return (
    <div className='Global'>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder='Username' value={username} onChange={e => setUsername(e.target.value)} />
        <input placeholder='Email' value={email} onChange={e => setEmail(e.target.value)} />
        <input type='password' placeholder='Password' value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type='submit'>Register</button>
      </form>
    </div>
  )
}

export default Register