import React, { useState, useEffect } from 'react'
import '../Global.css'
import { useNavigate } from 'react-router-dom'

const statusColors = {
  pending: '#e0a800',
  active: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#ef4444'
}

const User = () => {
  const [user, setUser] = useState(null)
  const [deals, setDeals] = useState([])
  const [dealsLoading, setDealsLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/user/profile/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setUser(data))

    fetch('/api/user/deals/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setDeals(data))
      .catch(() => setDeals([]))
      .finally(() => setDealsLoading(false))
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

      <h2 style={{ marginTop: '32px' }}>Deal History</h2>

      {dealsLoading ? (
        <p>Loading deals...</p>
      ) : deals.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No deals yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          {deals.map(deal => (
            <div
              key={deal.id}
              style={{
                background: '#2b2f4a',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{deal.item_name}</div>
                <div style={{ fontSize: '13px', opacity: 0.7 }}>${deal.price}</div>
              </div>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#fff',
                  background: statusColors[deal.status] || '#666'
                }}
              >
                {deal.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default User