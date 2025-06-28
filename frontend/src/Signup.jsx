import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Signup = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'success', 'error', 'validation'
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const [errors, setErrors] = useState({});
    
    const navigate = useNavigate();

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear specific error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Validation function
    const validateForm = () => {
        const newErrors = {};
        
        // Name validation
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        } else if (formData.firstName.trim().length < 2) {
            newErrors.firstName = 'First name must be at least 2 characters';
        }
        
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        } else if (formData.lastName.trim().length < 2) {
            newErrors.lastName = 'Last name must be at least 2 characters';
        }
        
        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        
        // Phone validation
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^[\d\+\-\(\)\s]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
        }
        
        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters long';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        }
        
        // Confirm password validation
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
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
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            
            console.log('Attempting registration with:', {
                name: fullName,
                email: formData.email,
                phone: formData.phone,
                backend: BACKEND_URL
            });

            const response = await axios.post(`${BACKEND_URL}/api/registeruser`, {
                name: fullName,
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                phone: formData.phone.trim(),
                role: 'user' // Default role
            });

            console.log('Registration response:', response.data);

            if (response.data.success) {
                showModalWithMessage(
                    'success',
                    'Registration Successful!',
                    'Your account has been created successfully. You will be redirected to the login page.'
                );
                
                // Clear form
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    phone: ''
                });
                
                // Redirect after a short delay
                setTimeout(() => {
                    closeModal();
                    navigate('/');
                }, 2500);
            } else {
                showModalWithMessage(
                    'error',
                    'Registration Failed',
                    response.data.message || 'Registration failed. Please try again.'
                );
            }
        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMessage = 'An unexpected error occurred. Please try again.';
            
            if (error.response) {
                // Server responded with error status
                if (error.response.status === 409) {
                    errorMessage = 'An account with this email already exists. Please use a different email or try logging in.';
                } else {
                    errorMessage = error.response.data.message || 
                                 `Server error: ${error.response.status}`;
                }
            } else if (error.request) {
                // Request was made but no response received
                errorMessage = 'Unable to connect to server. Please check your internet connection.';
            }
            
            showModalWithMessage(
                'error',
                'Registration Failed',
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
                <div className="bg-white p-4 rounded shadow" style={{ width: '400px' }}>
                    <h2 className="text-center mb-4">Register</h2>
                    <form onSubmit={handleSubmit}>
                        {/* First Name and Last Name side by side */}
                        <div className="mb-3 d-flex gap-2">
                            <div className="flex-fill">
                                <label htmlFor="firstName" className="form-label">
                                    <strong>First Name</strong>
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    placeholder="First Name"
                                    className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                    required
                                />
                                {errors.firstName && (
                                    <div className="invalid-feedback">
                                        {errors.firstName}
                                    </div>
                                )}
                            </div>
                            <div className="flex-fill">
                                <label htmlFor="lastName" className="form-label">
                                    <strong>Last Name</strong>
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    placeholder="Last Name"
                                    className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                    required
                                />
                                {errors.lastName && (
                                    <div className="invalid-feedback">
                                        {errors.lastName}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">
                                <strong>Email</strong>
                            </label>
                            <input 
                                type="email"
                                id="email"
                                name="email"
                                placeholder="Enter your email"
                                autoComplete="email"
                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                value={formData.email}
                                onChange={handleInputChange}
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
                            <label htmlFor="phone" className="form-label">
                                <strong>Phone Number</strong>
                            </label>
                            <input 
                                type="tel"
                                id="phone"
                                name="phone"
                                placeholder="Enter your phone number"
                                autoComplete="tel"
                                className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                                value={formData.phone}
                                onChange={handleInputChange}
                                disabled={loading}
                                required
                            />
                            {errors.phone && (
                                <div className="invalid-feedback">
                                    {errors.phone}
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
                                name="password"
                                placeholder="Enter your password"
                                autoComplete="new-password"
                                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                value={formData.password}
                                onChange={handleInputChange}
                                disabled={loading}
                                required
                            />
                            {errors.password && (
                                <div className="invalid-feedback">
                                    {errors.password}
                                </div>
                            )}
                            <div className="form-text">
                                Password must contain at least one uppercase letter, lowercase letter, and number.
                            </div>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="confirmPassword" className="form-label">
                                <strong>Confirm Password</strong>
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                placeholder="Confirm your password"
                                autoComplete="new-password"
                                className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                disabled={loading}
                                required
                            />
                            {errors.confirmPassword && (
                                <div className="invalid-feedback">
                                    {errors.confirmPassword}
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
                                    Creating Account...
                                </>
                            ) : (
                                'Register'
                            )}
                        </button>
                    </form>

                    <div className="text-center mt-3">
                        <p className="mb-2">Already have an account?</p>
                        <Link 
                            to="/" 
                            className="btn btn-outline-secondary w-100 text-decoration-none"
                        >
                            Log in
                        </Link>
                    </div>
                </div>
            </div>

            {/* Modal Component */}
            <Modal />
        </>
    );
};

export default Signup;