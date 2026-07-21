import { useState, useEffect } from 'react'
import '../Global.css'
import './User.css'
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
    <div className='Global'>
      <div className='up-container'>
        <button className='up-settings-btn' onClick={() => setShowSettings(!showSettings)}>⚙️</button>

        {showSettings && (
          <div className='up-settings-menu'>
            <button onClick={handleLogout}>Logout</button>
            <button onClick={handleLogout}>Switch Account</button>
          </div>
        )}

        {/* Profile card */}
        <div className='up-profile-card'>
          <div className='up-avatar'>{initial}</div>
          <div>
            <h1 className='up-profile-name'>{user.username}</h1>
            <p className='up-profile-meta'>{user.email}</p>
            {user.phone && <p className='up-profile-meta'>{user.phone}</p>}
          </div>
        </div>

        {/* Create deal */}
        <div className='up-section'>
          <button className='up-toggle-btn' onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : '+ Create Deal'}
          </button>

          {showCreateForm && (
            <div className='up-deal-form'>
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
              {createMsg && <p className='up-form-msg'>{createMsg}</p>}
            </div>
          )}
        </div>

        {/* Deal history */}
        <div className='up-section'>
          <h2 className='up-section-title'>Deal History</h2>

          {dealsLoading ? (
            <p className='up-empty'>Loading deals...</p>
          ) : deals.length === 0 ? (
            <p className='up-empty'>No deals yet — create one above to get started.</p>
          ) : (
            deals.map(deal => {
              const isOpen = expandedDealId === deal.id
              return (
                <div
                  key={deal.id}
                  className={`up-deal-card${isOpen ? ' open' : ''}`}
                  onClick={() => setExpandedDealId(isOpen ? null : deal.id)}
                >
                  <div className='up-deal-row'>
                    <div>
                      <div className='up-deal-name'>{deal.item_name}</div>
                      <div className='up-deal-price'>${deal.price}</div>
                    </div>
                    <span className='up-deal-badge' style={{ background: statusColors[deal.status] || '#666' }}>
                      {deal.status}
                    </span>
                  </div>

                  {isOpen && (
                    <div className='up-deal-details' onClick={e => e.stopPropagation()}>
                      <div className='up-row'><span>Deal ID</span><span>#{deal.id}</span></div>
                      {deal.buyer_id && <div className='up-row'><span>Buyer</span><span>{deal.buyer_id}</span></div>}
                      {deal.seller_id && <div className='up-row'><span>Seller</span><span>{deal.seller_id}</span></div>}
                      {deal.middleman_id && <div className='up-row'><span>Middleman</span><span>{deal.middleman_id}</span></div>}

                      {(deal.status === 'pending' || deal.status === 'active') && (
                        <div className='up-deal-actions'>
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
    </div>
  )
}

export default User