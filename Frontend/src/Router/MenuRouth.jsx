import React from 'react'
import { BrowserRouter as Router , Route , Routes } from 'react-router-dom'
import Home from '../Menu/Home/Home.jsx'
import Guide from '../Menu/Guide/Guide.jsx'
import Feature from '../Menu/Feature/Feature.jsx'
import Navbar from './Navbar.jsx'
import FQA from '../Menu/FQA/FQA.jsx'
import User from '../Menu/User/User.jsx'

import Register from '../pages/Register.jsx'
import Login from '../pages/Login.jsx'



const MenuRouth = () => {
  return (
    <Router>
        <Navbar/>
        <Routes>


            <Route path='/' element={<Home/>}/>
            <Route path='/Home' element={<Home/>}/>
            <Route path='/Guide' element={<Guide/>}/>
            <Route path='/Feature' element={<Feature/>}/>
            <Route path='/FQA' element={<FQA/>}/>
            <Route path='/User' element={<User/>}/>
            <Route path='/Register' element={<Register/>}/>
            <Route path='/Login' element={<Login/>}/>



        </Routes>
    </Router>
  )
}

export default MenuRouth