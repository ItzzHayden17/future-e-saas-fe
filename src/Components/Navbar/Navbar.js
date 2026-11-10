import React, { useState, useEffect } from 'react'
import './Navbar.css'
import axios from 'axios'
import Cookies from 'js-cookie'
import { serverUrl } from '../../serverUrl'
import { Link, useLocation } from 'react-router-dom'

const Navbar = () => {
    const [user, setUser] = useState({})
    const [isAdmin, setIsAdmin] = useState(false)
    const [isMarketer, setIsMarketer] = useState(false)

    const location = useLocation()

    useEffect(() => {
        try {
            const userData = Cookies.get("userData")
            const token = userData ? JSON.parse(userData).token : null

            axios.post(`${serverUrl}verify-token`, { token })
                .then(res => {
                    console.log(res.data.status + " " + res.data.message)

                    if (res.data.status !== 'success') {
                        window.location.href = '/'
                        return
                    }

                    const decodedUser = res.data.decoded

                    setUser(decodedUser)
                    console.log(decodedUser)

                    // Check if user is an admin
                    axios.get(`${serverUrl}users`)
                        .then(() => setIsAdmin(true))
                        .catch(() => setIsAdmin(false))
                })
                .catch(error => {
                    console.log(error)
                    window.location.href = '/'
                })

        } catch (error) {
            console.log(error)
            window.location.href = '/'
        }
    }, [])

    const isActive = (path) => {
        return location.pathname.toLowerCase() === path.toLowerCase()
            ? {
                textDecoration: 'underline',
                fontWeight: 'bold'
            }
            : {
                textDecoration: 'none',
                fontWeight: 'normal'
            }
    }

    return (
        <div className='Navbar'>

            <div className='user'>
                <h1>
                    <span>Hello, </span>
                    {user.username}
                </h1>
            </div>

            <div className='links'>

                <Link to="/home" style={isActive('/home')}>
                    Home
                </Link>

                <Link to="/clients" style={isActive('/clients')}>
                    Clients
                </Link>

                <Link to="/claims" style={isActive('/claims')}>
                    Claims
                </Link>

                <Link to="/SMS" style={isActive('/SMS')}>
                    SMS
                </Link>

                <Link to="/Email" style={isActive('/Email')}>
                    Email
                </Link>

                <Link to="/logpage" style={isActive('/logpage')}>
                    Logs
                </Link>

                {/* Only non-marketer admins can access Users */}
                {!isMarketer && isAdmin && (
                    <Link to="/users" style={isActive('/users')}>
                        Users
                    </Link>
                )}

            </div>

            <div className='company-logo'>
                <img
                    src="/assets/black_logo_with_text.png"
                    alt="Company Logo"
                />
            </div>

        </div>
    )
}

export default Navbar
