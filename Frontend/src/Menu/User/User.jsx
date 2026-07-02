import React, { useState, useEffect } from 'react'
import '../Global.css'

const User = () => {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch('/api/user/profile/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setUser(data))
  }, [])

  if (!user) return <div className='Global'>Loading...</div>

  return (
    <div className='Global'>
      <h1>{user.username}</h1>
      <p>{user.email}</p>
      <p>{user.phone}</p>
    </div>
  )
}

export default User