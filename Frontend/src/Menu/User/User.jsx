// import React, { useState, useEffect } from 'react'
import { useState, useEffect } from 'react'
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
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [expandedDealId, setExpandedDealId] = useState(null)
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

  if (!user) return <div className='Global'>Loading...</div>

  const initial = user.username ? user.username[0].toUpperCase() : '?'

  return (
    <div className='Global UserPage'>
      <button className='settingsBtn' onClick={() => setShowSettings(!showSettings)}>⚙️</button>

      {showSettings && (
        <div className='settingsMenu'>
          <button onClick={handleLogout}>Logout</button>
          <button onClick={handleLogout}>Switch Account</button>
        </div>
      )}

      {/* Profile card */}
      <div className='profileCard'>
        <div className='profileAvatar'>{initial}</div>
        <div className='profileInfo'>
          <h1>{user.username}</h1>
          <p>{user.email}</p>
          {user.phone && <p>{user.phone}</p>}
        </div>
      </div>

      {/* Create deal */}
      <div className='section'>
        <button className='toggleFormBtn' onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : '+ Create Deal'}
        </button>

        {showCreateForm && (
          <div className='dealForm'>
            <input
              placeholder='Seller username'
              value={sellerUsername}
              onChange={e => setSellerUsername(e.target.value)}
            />
            <input
              placeholder='Item name'
              value={itemName}
              onChange={e => setItemName(e.target.value)}
            />
            <input
              placeholder='Price'
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
            <button onClick={handleCreateDeal}>Submit Deal</button>
            {createMsg && <p className='msg'>{createMsg}</p>}
          </div>
        )}
      </div>

      {/* Deal history */}
      <div className='section'>
        <h2>Deal History</h2>

        {dealsLoading ? (
          <p className='emptyText'>Loading deals...</p>
        ) : deals.length === 0 ? (
          <p className='emptyText'>No deals yet — create one above to get started.</p>
        ) : (
          deals.map(deal => {
            const isOpen = expandedDealId === deal.id
            return (
              <div
                key={deal.id}
                className='dealCard'
                onClick={() => setExpandedDealId(isOpen ? null : deal.id)}
              >
                <div className='dealRow'>
                  <div>
                    <div className='dealName'>{deal.item_name}</div>
                    <div className='dealPrice'>${deal.price}</div>
                  </div>
                  <span className='dealBadge' style={{ background: statusColors[deal.status] || '#666' }}>
                    {deal.status}
                  </span>
                </div>

                {isOpen && (
                  <div className='dealDetails' onClick={e => e.stopPropagation()}>
                    <div className='row'><span>Deal ID</span><span>#{deal.id}</span></div>
                    {deal.buyer_id && <div className='row'><span>Buyer</span><span>{deal.buyer_id}</span></div>}
                    {deal.seller_id && <div className='row'><span>Seller</span><span>{deal.seller_id}</span></div>}
                    {deal.middleman_id && <div className='row'><span>Middleman</span><span>{deal.middleman_id}</span></div>}

                    {(deal.status === 'pending' || deal.status === 'active') && (
                      <div className='dealActions'>
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
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default User