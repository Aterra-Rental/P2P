import React, { useState, useEffect } from 'react'
import '../Global.css'
import { useNavigate } from 'react-router-dom'

const User = () => {
  const [user, setUser] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/user/profile/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setUser(data))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/Login')
  }

  if (!user) return <div className='Global'>Loading...</div>

  return (
    <div className='Global' style={{ padding: '32px', position: 'relative' }}>
      <button
        onClick={() => setShowSettings(!showSettings)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'none',
          border: 'none',
          fontSize: '22px',
          cursor: 'pointer',
          color: 'inherit'
        }}
      >
        ⚙️
      </button>

      {showSettings && (
        <div style={{
          position: 'absolute',
          top: '55px',
          right: '20px',
          background: '#2b2f4a',
          borderRadius: '8px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
        }}>
          <button
            onClick={handleLogout}
            style={{ padding: '8px 16px', background: 'none', border: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer' }}
          >
            Logout
          </button>
          <button
            onClick={handleLogout}
            style={{ padding: '8px 16px', background: 'none', border: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer' }}
          >
            Switch Account
          </button>
        </div>
      )}

      <h1>{user.username}</h1>
      <p>{user.email}</p>
      <p>{user.phone}</p>
    </div>
  )
}

export default User