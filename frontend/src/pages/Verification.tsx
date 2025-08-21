import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import EmailVerificationPanel from '../components/common/EmailVerificationPanel';

const Verification = () => {
  const location = useLocation();
  const email = location.state?.email;

  // If no email is provided, redirect to register
  if (!email) {
    return <Navigate to="/register" replace />;
  }

  return (
    <EmailVerificationPanel
      email={email}
      onBack={() => window.history.back()}
    />
  );
};

export default Verification;
