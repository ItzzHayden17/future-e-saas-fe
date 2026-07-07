import React from 'react'
import './Navbar.css'
import { useState,useEffect } from 'react'
import axios from 'axios'
import Cookies from 'js-cookie'
import { serverUrl } from '../../serverUrl'
import { BrowserRouter,Routes,Route, Link, useLocation } from 'react-router-dom';



const Navbar = () => {


        const [user,setUser] = useState({})
        const [activeLink, setActiveLink] = useState('home')

    useEffect(() => {
       try { 
        
            const userData = Cookies.get("userData")
        
            axios.post(`${serverUrl}verify-token`, { token: userData ? JSON.parse(userData).token : null }).then(res => {
            console.log(res.data.status + " " + res.data.message);
            if(res.data.status !== 'success'){
                window.location.href = '/'
            }else{
                setUser(res.data.decoded)
                console.log(res.data.decoded);
                console.log(user);
                
            }
        })
        } catch (error) {
            console.log(error);
            window.location.href = '/'
        }
    }, [])

    const  location = useLocation()
    const pathname = location.pathname.split('/')[1]
    console.log(pathname);
    

    // console.log(pathname);
    

  return (
    <div className='Navbar'>
        <div className='user'>
        <h1><span>Hello, </span>{user.username}</h1>
        </div>
        <div className='links'>
            <Link to="/home" style={{
          textDecoration: location.pathname === "/home" ? "underline" : "none",
          fontWeight: location.pathname === "/home" ? "bold" : "normal"
        }}>Home</Link>
            <Link to="/SMS" style={{
          textDecoration: location.pathname === "/SMS" ? "underline" : "none",
          fontWeight: location.pathname === "/SMS" ? "bold" : "normal"
        }}>SMS</Link>
            <Link to="/Email" style={{
          textDecoration: location.pathname === "/Email" ? "underline" : "none",
          fontWeight: location.pathname === "/SMS" ? "bold" : "normal"
        }}>Email</Link>
        </div>
        <div className='company-logo'>
            <img src="/assets/black_logo_with_text.png"/>
        </div>
    </div>
  )
}

export default Navbar