import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../Global.css'
import './Home.css'

const Deal = () => {
  const navigate = useNavigate()

  const [sellerUsername, setSellerUsername] = useState('')
  const [itemName, setItemName] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/Login')
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/deal/create/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ seller_username: sellerUsername, item_name: itemName, price })
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error || 'Failed to create deal')
      return
    }

    navigate('/User')
  }

  return (
    <div className='Global d-flex flex-column min-vh-100'>

      <header className="row p-3">
        <div className="col-12">
          <button
            className="button_under2"
            style={{ backgroundColor: '#333', padding: '10px 20px' }}
            onClick={() => navigate('/')}
          >
            ← Back to Home
          </button>
        </div>
      </header>

      <main className="container-fluid d-flex flex-column justify-content-center align-items-start ps-5">
        <div className="row w-100">

          <div className="col-12 welcometext">
            <h2>Start Your Automated Escrow</h2>
            <div className="underwelcome">
              <h2>Fill out the step-by-step transaction details below to securely protect both parties.</h2>
            </div>
          </div>

          <div className="col-12 mt-4 ps-5">
            <form
              onSubmit={handleSubmit}
              className='card'
              style={{ padding: '2rem', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <input
                placeholder='Seller username'
                value={sellerUsername}
                onChange={e => setSellerUsername(e.target.value)}
                required
              />
              <input
                placeholder='Item name'
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                required
              />
              <input
                placeholder='Price'
                type='number'
                step='0.01'
                value={price}
                onChange={e => setPrice(e.target.value)}
                required
              />
              {error && <p style={{ color: '#ff6b6b', margin: 0, fontSize: '0.85rem' }}>{error}</p>}
              <button type='submit' className='btn-primary' disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Deal'}
              </button>
            </form>
          </div>

        </div>
      </main>

    </div>
  )
}

export default Deal