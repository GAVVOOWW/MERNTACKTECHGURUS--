import React, { useState } from 'react'
import { Link, } from 'react-router-dom';
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Signup = () => {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState()
    const [password, setPassword] = useState()
    const [confirmPassword, setConfirmPassword] = useState('')
    const [phone, setPhone] = useState()

    const handleSubmit = (e) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        const fullName = `${firstName} ${lastName}`.trim();

        axios.post(`${BACKEND_URL}/api/registeruser`, {
            name: fullName,
            email,
            password,
            phone
        })
            .then(result => console.log(result))
            .catch(err => console.log(err))



    }

    return (
        <div className="d-flex justify-content-center align-items-center bg-secondary vh-100" >
            <div className="bg-white p-3 rounded w-25">
                <h2>Register</h2>
                <form onSubmit={handleSubmit}>

                    {/* First Name and Last Name side by side */}
                    <div className="mb-3 d-flex gap-2">
                        <div className="flex-fill">
                            <label htmlFor="firstName"><strong>First Name</strong></label>
                            <input
                                type="text"
                                id="firstName"
                                placeholder="First Name"
                                className="form-control"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex-fill">
                            <label htmlFor="lastName"><strong>Last Name</strong></label>
                            <input
                                type="text"
                                id="lastName"
                                placeholder="Last Name"
                                className="form-control"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

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

                        <label htmlFor="Phone">
                            <strong>Phone</strong>
                        </label>
                        <input type="number"
                            placeholder='Enter your Phone Number'
                            autoComplete='off'
                            name='Phone'
                            className='form-control rounded-8'
                            onChange={(e) => setPhone(e.target.value)}

                        />

                    </div>

                    <div className="mb-3">
                        <label htmlFor="Password"><strong>Password</strong></label>
                        <input
                            type="password"
                            placeholder='Enter your password'
                            autoComplete='off'
                            name='password'
                            className='form-control rounded-8'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="confirmPassword"><strong>Confirm Password</strong></label>
                        <input
                            type="password"
                            id="confirmPassword"
                            placeholder='Confirm your password'
                            autoComplete='off'
                            className='form-control rounded-8'
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type='submit' className='btn btn-primary w-100 mt-3'>
                        Register
                    </button>

                    <p>Already Have an Account?</p>
                    <Link to='/' className='btn btn-default border w-100 rounded-0 text-decoration-none'>
                        Log in
                    </Link>

                </form>

            </div>
        </div>

    )
}

export default Signup
