import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Signup from './signup.jsx';
import Login from './Login.jsx';
import Home from './Home.jsx';
import Itemspage from './Itemspage.jsx';
import SingleItemPage from './SingleItemPage.jsx';
import AdminPage from './AdminPage.jsx';
import CheckoutPage from './CheckoutPage.jsx';
import SuccessPage from './SuccessPage.jsx';
import CancelPage from './CancelPage.jsx';
import OrderHistory from './OrderHistory.jsx';
import OrderDetail from './OrderDetail.jsx';
import ChatPage from './ChatPage.jsx';
import RecommendationPage from './RecommendationPage.jsx';
import UserProfile from './UserProfile.jsx';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/" element={<Itemspage />} />
        <Route path="/item/:id" element={<SingleItemPage />} />
        <Route path="/cart" element={<Home />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<SuccessPage />} />
        <Route path="/checkout/cancel" element={<CancelPage />} />
        <Route path="/orders" element={<OrderHistory />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/recommendation" element={<RecommendationPage />} />
        <Route path="*" element={<div className="container mt-5"><h2>404 - Page Not Found</h2></div>} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;