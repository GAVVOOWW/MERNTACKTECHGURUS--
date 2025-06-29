import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// A simple spinner component for loading states
const Spinner = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ height: '100px' }}>
    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

const SuccessBalance = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasRun = useRef(false);

  // State to manage UI feedback
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    // Prevent the effect from running more than once on component mount.
    if (hasRun.current) return;
    hasRun.current = true;

    console.log("=== BALANCE PAYMENT SUCCESS PAGE LOADED ===");

    const processBalancePayment = async () => {
      try {
        const orderId = searchParams.get('order_id');
        const token = localStorage.getItem('token');

        console.log("Order ID from URL:", orderId);

        if (!orderId) {
          console.error("ERROR: No order ID found in URL parameters.");
          setError("Could not find order information. Please check your order history.");
          setIsLoading(false);
          return;
        }

        if (!token) {
          console.error("ERROR: No authentication token found.");
          setError("Authentication required. Please log in again.");
          setIsLoading(false);
          return;
        }

        console.log("=== FETCHING UPDATED ORDER DETAILS ===");
        
        // Fetch the updated order details to confirm payment
        const response = await axios.get(`${BACKEND_URL}/api/orders/${orderId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const order = response.data;
        console.log("Updated order data:", order);

        setOrderDetails(order);

        // Verify that the balance payment was processed
        if (order.paymentStatus === 'Fully Paid' && order.balance === 0) {
          setSuccessMessage('Your remaining balance has been successfully paid! Your order is now fully paid.');
          console.log("=== BALANCE PAYMENT CONFIRMED SUCCESSFULLY ===");
        } else {
          console.warn("Order payment status:", order.paymentStatus);
          console.warn("Remaining balance:", order.balance);
          setSuccessMessage('Payment processed, but there may be an issue with the payment status. Please contact support if needed.');
        }

      } catch (err) {
        console.error('=== BALANCE PAYMENT PROCESSING ERROR ===');
        console.error('Failed to process balance payment:', err);
        const errorMessage = err.response?.data?.message || 'An unexpected error occurred while processing your balance payment. Please contact support.';
        setError(errorMessage);
      } finally {
        // Stop the loading indicator regardless of success or failure.
        setIsLoading(false);
      }
    };

    processBalancePayment();
  }, [searchParams]); // Include searchParams in dependencies

  // Renders UI content based on the current state (loading, error, or success).
  const renderContent = () => {
    if (isLoading) {
      return (
        <>
          <h2>Confirming Your Balance Payment...</h2>
          <p>Please wait, we're verifying your payment. Do not refresh the page.</p>
          <Spinner />
        </>
      );
    }

    if (error) {
      return (
        <>
          <h2 className="text-danger">Payment Verification Failed</h2>
          <p className="text-danger fw-bold">{error}</p>
          <p>If you believe payment was taken, please save a screenshot and contact our support team immediately.</p>
          <div className="d-grid gap-2 d-sm-flex justify-content-sm-center mt-4">
            <button className="btn btn-primary" onClick={() => navigate('/orders')}>
              Check Order History
            </button>
            <button className="btn btn-outline-secondary" onClick={() => navigate('/')}>
              Back to Homepage
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="text-center mb-4">
          <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
               style={{ width: '80px', height: '80px' }}>
            <i className="fas fa-check" style={{ fontSize: '2rem' }}></i>
          </div>
          <h2 className="text-success">Balance Payment Successful!</h2>
          <p className="lead">{successMessage}</p>
        </div>

        {orderDetails && (
          <div className="bg-light rounded p-4 mb-4">
            <h5 className="mb-3">Order Summary</h5>
            <div className="row text-start">
              <div className="col-sm-6">
                <p><strong>Order ID:</strong> #{orderDetails._id?.slice(-8)}</p>
                <p><strong>Total Amount:</strong> ₱{orderDetails.amount?.toLocaleString()}</p>
              </div>
              <div className="col-sm-6">
                <p><strong>Status:</strong> <span className="badge bg-success">{orderDetails.status}</span></p>
                <p><strong>Payment Status:</strong> <span className="badge bg-success">{orderDetails.paymentStatus}</span></p>
              </div>
            </div>
            <div className="text-center mt-3">
              <p className="text-success mb-0">
                <i className="fas fa-check-circle me-2"></i>
                Your order is now fully paid and being processed!
              </p>
            </div>
          </div>
        )}

        <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
          <button
            className="btn btn-primary btn-lg px-4"
            onClick={() => navigate('/orders')}
          >
            <i className="fas fa-list me-2"></i>
            View Your Orders
          </button>
          <button
            className="btn btn-outline-secondary btn-lg px-4"
            onClick={() => navigate('/')}
          >
            <i className="fas fa-home me-2"></i>
            Continue Shopping
          </button>
          {orderDetails && (
            <button
              className="btn btn-outline-info btn-lg px-4"
              onClick={() => navigate(`/order/${orderDetails._id}`)}
            >
              <i className="fas fa-eye me-2"></i>
              View Order Details
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-lg border-0">
            <div className="card-body p-4 p-md-5 text-center">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessBalance;