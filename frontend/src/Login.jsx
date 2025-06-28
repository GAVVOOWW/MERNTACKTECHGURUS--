import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'success', 'error', 'validation'
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const [errors, setErrors] = useState({});
    
    const navigate = useNavigate();

    // Validation function
    const validateForm = () => {
        const newErrors = {};
        
        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        
        if (!password.trim()) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters long';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Show modal function
    const showModalWithMessage = (type, title, message) => {
        setModalType(type);
        setModalTitle(title);
        setModalMessage(message);
        setShowModal(true);
    };

    // Close modal function
    const closeModal = () => {
        setShowModal(false);
        setModalType('');
        setModalMessage('');
        setModalTitle('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Clear previous errors
        setErrors({});
        
        // Validate form
        if (!validateForm()) {
            showModalWithMessage(
                'validation',
                'Validation Error',
                'Please fix the errors below and try again.'
            );
            return;
        }

        setLoading(true);

        try {
            console.log('Attempting login with:', { email, backend: BACKEND_URL });
            
            const response = await axios.post(`${BACKEND_URL}/api/login`, { 
                email: email.trim(), 
                password: password.trim() 
            });

            console.log('Login response:', response.data);

            if (response.data.success) {
                // Store user data
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('userId', response.data.userId);
                localStorage.setItem('role', response.data.role);
                
                // Show success modal
                showModalWithMessage(
                    'success',
                    'Login Successful!',
                    `Welcome back! You will be redirected to the homepage.`
                );
                
                // Redirect after a short delay
                setTimeout(() => {
                    closeModal();
                    navigate('/');
                }, 2000);
            } else {
                showModalWithMessage(
                    'error',
                    'Login Failed',
                    response.data.message || 'Login failed. Please try again.'
                );
            }
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'An unexpected error occurred. Please try again.';
            
            if (error.response) {
                // Server responded with error status
                errorMessage = error.response.data.message || 
                             `Server error: ${error.response.status}`;
            } else if (error.request) {
                // Request was made but no response received
                errorMessage = 'Unable to connect to server. Please check your internet connection.';
            }
            
            showModalWithMessage(
                'error',
                'Login Failed',
                errorMessage
            );
        } finally {
            setLoading(false);
        }
    };

    // Modal component
    const Modal = () => {
        if (!showModal) return null;

        const getModalClass = () => {
            switch (modalType) {
                case 'success': return 'text-success';
                case 'error': return 'text-danger';
                case 'validation': return 'text-warning';
                default: return '';
            }
        };

        const getIcon = () => {
            switch (modalType) {
                case 'success': return '✅';
                case 'error': return '❌';
                case 'validation': return '⚠️';
                default: return 'ℹ️';
            }
        };

        return (
            <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className={`modal-title ${getModalClass()}`}>
                                {getIcon()} {modalTitle}
                            </h5>
                            <button 
                                type="button" 
                                className="btn-close" 
                                onClick={closeModal}
                                disabled={loading}
                            ></button>
                        </div>
                        <div className="modal-body">
                            <p>{modalMessage}</p>
                            {modalType === 'validation' && Object.keys(errors).length > 0 && (
                                <ul className="list-unstyled mt-2">
                                    {Object.values(errors).map((error, index) => (
                                        <li key={index} className="text-danger small">
                                            • {error}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={closeModal}
                                disabled={loading}
                            >
                                {modalType === 'success' ? 'Close' : 'Try Again'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="d-flex justify-content-center align-items-center bg-secondary vh-100">
                <div className="bg-white p-4 rounded w-25 shadow">
                    <h2 className="text-center mb-4">Login</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">
                                <strong>Email</strong>
                            </label>
                            <input 
                                type="email"
                                id="email"
                                placeholder="Enter your email"
                                autoComplete="email"
                                name="email"
                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                            />
                            {errors.email && (
                                <div className="invalid-feedback">
                                    {errors.email}
                                </div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">
                                <strong>Password</strong>
                            </label>
                            <input 
                                type="password"
                                id="password"
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                name="password"
                                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                            />
                            {errors.password && (
                                <div className="invalid-feedback">
                                    {errors.password}
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary w-100 mt-3"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Logging in...
                                </>
                            ) : (
                                'Login'
                            )}
                        </button>
                    </form>

                    <div className="text-center mt-3">
                        <p className="mb-2">Don't have an account yet?</p>
                        <Link 
                            to="/register" 
                            className="btn btn-outline-secondary w-100 text-decoration-none"
                        >
                            Register
                        </Link>
                    </div>
                </div>
            </div>

            {/* Modal Component */}
            <Modal />
        </>
    );
};

export default Login;