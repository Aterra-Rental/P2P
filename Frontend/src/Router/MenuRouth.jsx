
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom'
import Home from '../Menu/Home/Home.jsx'

import Feature from '../Menu/Feature/Feature.jsx'
import Navbar from './Navbar.jsx'
import FQA from '../Menu/FQA/FQA.jsx'
import Footer from './Footer.jsx'
import User from '../Menu/User/User.jsx'
import Register from '../pages/Register.jsx'
import Login from '../pages/Login.jsx'
<<<<<<< HEAD
import Deal from '../Menu/Home/deal'
import Footer from './Footer.jsx'
import CompleteProfile from '../pages/CompleteProfile.jsx'
// import Footer from './Footer.jsx'
=======
import DealRoom from '../Menu/Home/DealRoom.jsx'

>>>>>>> d138399dd495003658f0072e1a98a28f378afa56
const Layout = () => {
  const location = useLocation()
  const hideNavbar = ['/Register', '/Login'].includes(location.pathname)

  return (
    <>
      {!hideNavbar && <Navbar/>}
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/Home' element={<Home/>}/>
        <Route path='/Feature' element={<Feature/>}/>
        <Route path='/FQA' element={<FQA/>}/>
        <Route path='/User' element={<User/>}/>
        <Route path='/Register' element={<Register/>}/>
        <Route path='/Login' element={<Login/>}/>
<<<<<<< HEAD
        <Route path='/CompleteProfile' element={<CompleteProfile/>} />
        <Route path='/create-deal' element={<Deal/>}/>
=======
        <Route path="/create-deal" element={<DealRoom />}/>
>>>>>>> d138399dd495003658f0072e1a98a28f378afa56
      </Routes>
      {!hideNavbar && <Footer/>}
    </>
  )
}

const MenuRouth = () => {
  return (
    <Router>
      <Layout/>
    </Router>
  )
}

export default MenuRouth