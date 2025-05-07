import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ConsentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success');

  useEffect(() => {
    if (success === 'true') {
      // Consent approved, redirect to dashboard
      navigate('/dashboard');
    } else {
      // Consent rejected or error, show message and redirect back to add account
      alert('Consent was not approved. Please try again.');
      navigate('/add-account');
    }
  }, [success, navigate]);

  return <div>Redirecting...</div>;
};

export default ConsentCallback;