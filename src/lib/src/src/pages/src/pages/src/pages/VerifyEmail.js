import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const email = location.state?.email || '';
  
  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);
  
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const pendingData = JSON.parse(sessionStorage.getItem('pendingVerification'));
      
      if (!pendingData) {
        throw new Error('No pending verification found. Please sign up again.');
      }
      
      if (new Date(pendingData.expiresAt) < new Date()) {
        throw new Error('Verification code expired. Please sign up again.');
      }
      
      if (verificationCode !== pendingData.verificationCode) {
        throw new Error('Invalid verification code');
      }
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: pendingData.email,
        password: pendingData.password,
        options: {
          data: {
            full_name: pendingData.fullName,
            username: pendingData.username
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: pendingData.username,
          full_name: pendingData.fullName,
          avatar_url: `https://ui-avatars.com/api/?name=${pendingData.fullName}&background=0095f6&color=fff`
        });
      
      if (profileError) throw profileError;
      
      sessionStorage.removeItem('pendingVerification');
      
      navigate('/login', { 
        state: { message: 'Email verified! You can now log in.' }
      });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResend = async () => {
    setResendDisabled(true);
    setCountdown(60);
    
    const pendingData = JSON.parse(sessionStorage.getItem('pendingVerification'));
    
    if (pendingData) {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      pendingData.verificationCode = newCode;
      pendingData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      sessionStorage.setItem('pendingVerification', JSON.stringify(pendingData));
      
      await fetch('/.netlify/functions/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingData.email,
          username: pendingData.username,
          verificationCode: newCode
        })
      });
    }
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>✉️ VERIFY EMAIL</h1>
          <p>We've sent a verification code to</p>
          <p className="email-highlight">{email}</p>
        </div>
        
        <form onSubmit={handleVerify} className="auth-form">
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength="6"
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
        
        <div className="auth-footer">
          <button 
            onClick={handleResend} 
            disabled={resendDisabled}
            className="resend-button"
          >
            {resendDisabled ? `Resend in ${countdown}s` : "Didn't receive email? Resend"}
          </button>
        </div>
      </div>
    </div>
  );
    }
