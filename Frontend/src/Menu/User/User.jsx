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

  const [sellerUsername, setSellerUsername] = useState('')
  const [itemName, setItemName] = useState('')
  const [price, setPrice] = useState('')
  const [createMsg, setCreateMsg] = useState('')

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

  const handleCreateDeal = async () => {
    setCreateMsg('')
    const res = await fetch('/api/deal/create/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ seller_username: sellerUsername, item_name: itemName, price })
    })
    const data = await res.json()
    if (res.ok) {
      setDeals(prev => [data, ...prev])
      setSellerUsername('')
      setItemName('')
      setPrice('')
      setCreateMsg('Deal created!')
    } else {
      setCreateMsg(data.error || 'Failed to create deal')
    }
  }

  if (!user) return <div className='Global'>Loading...</div>

  const handleStatusChange = async (dealId, newStatus) => {
    const res = await fetch(`/api/deal/${dealId}/status/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status: newStatus })
    })
    const data = await res.json()
    if (res.ok) {
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: data.status } : d))
    }
  }

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

      <h2 style={{ marginTop: '32px' }}>Create Deal</h2>
      <input
        placeholder="Seller username"
        value={sellerUsername}
        onChange={e => setSellerUsername(e.target.value)}
        style={{ display: 'block', marginBottom: '8px', padding: '6px', width: '100%' }}
      />
      <input
        placeholder="Item name"
        value={itemName}
        onChange={e => setItemName(e.target.value)}
        style={{ display: 'block', marginBottom: '8px', padding: '6px', width: '100%' }}
      />
      <input
        placeholder="Price"
        value={price}
        onChange={e => setPrice(e.target.value)}
        style={{ display: 'block', marginBottom: '8px', padding: '6px', width: '100%' }}
      />
      <button onClick={handleCreateDeal}>Create Deal</button>
      {createMsg && <p>{createMsg}</p>}

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
                padding: '12px 16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

              {(deal.status === 'pending' || deal.status === 'active') && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {deal.status === 'pending' && (
                    <button onClick={() => handleStatusChange(deal.id, 'active')}>Accept</button>
                  )}
                  {deal.status === 'active' && (
                    <button onClick={() => handleStatusChange(deal.id, 'completed')}>Mark Completed</button>
                  )}
                  <button onClick={() => handleStatusChange(deal.id, 'cancelled')}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default User