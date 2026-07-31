import React from 'react'
import MenuRouth from './Router/MenuRouth'
import { AuthProvider } from './components/AuthContext'

const App = () => {
  return (
    <AuthProvider>
      <MenuRouth />
    </AuthProvider>
  )
}

export default App