
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom'
import Home from '../Menu/Home/Home.jsx'
import Feature from '../Menu/Feature/Feature.jsx'
import Navbar from './Navbar.jsx'
import FQA from '../Menu/FQA/FQA.jsx'
import Footer from './Footer.jsx'
import Dashboard from '../Menu/User/Dashboard.jsx'
import Register from '../pages/Register.jsx'
import Login from '../pages/Login.jsx'
import CompleteProfile from '../pages/CompleteProfile.jsx'
import DealRoom from '../Menu/Home/DealRoom.jsx'
import CameraPage from '../components/Camera/CameraPage.jsx'
import PreviewPage from '../components/Camera/PreviewPage.jsx'
import AdminLogin from '../Admin/Components/Login/AdminLogin.jsx'
import ProtectedAdminRoute from '../Admin/Components/ProtectedRoute/ProtectedAdminRoute.jsx'
import AdminDashboard from '../Admin/Dashboard/Dashboard.jsx'
const Layout = () => {
  const location = useLocation()
  const hideLayout =
  ['/Register', '/Login', '/admin/login'].includes(location.pathname) ||
  location.pathname.startsWith('/camera') ||
  location.pathname.startsWith('/admin');

  return (
    <>
      {!hideLayout && <Navbar/>}
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/Home' element={<Home/>}/>
        <Route path='/Feature' element={<Feature/>}/>
        <Route path='/FQA' element={<FQA/>}/>
        <Route path='/Dashboard' element={<Dashboard/>}/>
        <Route path='/Register' element={<Register/>}/>
        <Route path='/Login' element={<Login/>}/>
        <Route path='/CompleteProfile' element={<CompleteProfile/>} />
        <Route path="/create-deal" element={<DealRoom />}/>
        <Route path="/camera/:type" element={<CameraPage />} />
        <Route path="/camera/:type/preview" element={<PreviewPage />} />
        <Route path="/admin/login" element={<AdminLogin />}/>
        <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>}/>
      </Routes>
      {!hideLayout && <Footer/>}
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