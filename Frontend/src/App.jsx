import React, { useEffect } from "react";
import MenuRouth from './Router/MenuRouth'
import { AuthProvider } from './components/AuthContext'

const App = () => {
  useEffect(() => {
  console.log(
    "APP MOUNTED:",
    new Date().toLocaleTimeString()
  );

  return () => {
    console.log(
      "APP UNMOUNTED:",
      new Date().toLocaleTimeString()
    );
  };
}, []);
  return (
    <AuthProvider>
      <MenuRouth />
    </AuthProvider>
  )
}

export default App