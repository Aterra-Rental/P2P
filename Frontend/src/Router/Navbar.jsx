import React from 'react'
import { NavLink } from 'react-router-dom'
import './Navbar.css'




const Navbar = () => {
     const closeMenu = () =>{
  const toggle = document.getElementById('nav-toggle')
  if(toggle) toggle.checked = false
     }
  return (
     <div>
    <nav className='navbar ' aria-label='Primary' >
      <div className='nav_inner'>
        <div className='brand' >
              {/* <img src={F1} alt="F1_logo" className='F1_logo w-full  ' /> */}
        </div>
              <input type="checkbox" aria-controls='primary-menu' aria-expanded="false" id='nav-toggle' className='toggle'/>
              <label htmlFor='nav-toggle' className='toggle-label' aria-label='Toggle navigation'>
                <span></span>
                <span></span>
                <span></span>
              </label>
              <ul  id='primary-menu' className='menu'>
                <li> <NavLink  to={'/'}></NavLink></li>
                <li><NavLink  to={'/Home'} className=' navlink text-decoration-none text-2xl  font-TitilliumWeb-BoldItalic ' onClick={closeMenu}>Home</NavLink></li>
                <li><NavLink className='  navlink text-decoration-none text-2xl ' to={'/Guide'} onClick={closeMenu}  >Guide</NavLink></li>
                <li><NavLink className='  navlink text-decoration-none text-2xl  ' to={'/Feature'} onClick={closeMenu}>Features</NavLink></li>
                <li><NavLink className=' navlink text-decoration-none text-2xl ' to={'/FQA'} onClick={closeMenu}>FQA</NavLink></li>
                <li><NavLink className=' navlink text-decoration-none text-2xl user   ' to={'/User'} onClick={closeMenu} >Users</NavLink></li>
              </ul>
      </div>
      </nav>   
    </div>
  )
}

export default Navbar