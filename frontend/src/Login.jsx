import React from 'react'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Login = () => {

    const [email, setEmail] = useState()
    const [password, setPassword] = useState()
    const navigate = useNavigate()

    const handleSubmit = (e) => {
        e.preventDefault()

        axios.post(`${BACKEND_URL}/api/login`, { email, password })
            .then(result => {
                console.log(result)
                localStorage.setItem('token', result.data.token);
                localStorage.setItem('userId', result.data.userId);
                localStorage.setItem('role', result.data.role); // For login
                if (result.data.success === true) {
                    navigate(`/`);
                }
            })
            .catch(err => console.log(err))
    }






    return (
        <div className="d-flex justify-content-center align-items-center bg-secondary vh-100" >
            <div className="bg-white p-3 rounded w-25">
                <h2>Login</h2>
                <form onSubmit={handleSubmit}>



                    <div className="mb-3">

                        <label htmlFor="Email">
                            <strong>Email</strong>
                        </label>
                        <input type="text"
                            placeholder='Enter your email'
                            autoComplete='off'
                            name='email'
                            className='form-control rounded-8'
                            onChange={(e) => setEmail(e.target.value)}

                        />

                    </div>



                    <div className="mb-3">

                        <label htmlFor="Password">
                            <strong>Password</strong>
                        </label>
                        <input type="password"
                            placeholder='Enter your password'
                            autoComplete='off'
                            name='password'
                            className='form-control rounded-8'
                            onChange={(e) => setPassword(e.target.value)}

                        />

                    </div>

                    <button type='submit' className='btn btn-primary w-100 mt-3'>
                        Login
                    </button>

                    <p>Dont have an Account yet?</p>
                    <Link to='/register' className='btn btn-default border w-100 rounded-0 text-decoration-none'>
                        Register
                    </Link>

                </form>

            </div>
        </div>

    )
}

export default Login
