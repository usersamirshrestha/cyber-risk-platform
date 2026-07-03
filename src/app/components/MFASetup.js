'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { QRCodeSVG } from 'qrcode.react';

export default function MFASetup() {
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data && data.currentLevel === 'aal2') {
      setIsEnrolled(true);
    }
  };

  const handleEnableMFA = async () => {
    setError('');
    setSuccess('');
    try {
      // 1. Fetch all existing factors associated with the current user session
      const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
      if (factorsErr) throw factorsErr;

      // 2. Identify if an unverified TOTP instance is blocking a new registration setup
      const existingUnverified = factorsData?.all?.find(f => f.status === 'unverified');

      if (existingUnverified) {
        // Clear the stale factor so the registration cycle can start fresh
        await supabase.auth.mfa.unenroll({ factorId: existingUnverified.id });
      }

      // 3. Request a fresh cryptographic factor configuration profile from Supabase
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (error) throw error;

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyMFA = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Create a verification challenge token request for the factor
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      // Submit the challenge ID and user's 6-digit TOTP string code
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });
      if (verify.error) throw verify.error;

      setSuccess('MFA successfully activated! Your account is now secured.');
      setIsEnrolled(true);
      setQrCode(''); 
    } catch (err) {
      setError('Invalid verification code. Please try again.');
    }
  };

  if (isEnrolled) {
    return (
      <div className="bg-green-950/30 border border-green-500/40 p-6 rounded-xl space-y-2">
        <h3 className="text-green-400 font-bold flex items-center gap-2">
          <span>🔒</span> Maximum Security Enabled
        </h3>
        <p className="text-gray-400 text-sm">
          Multi-Factor Authentication (MFA) is actively protecting this operator account. Password hashing (bcrypt) is automatically enforced via Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4 shadow-md">
      <h3 className="text-lg font-bold text-white tracking-tight">Enhance Security (MFA)</h3>
      <p className="text-gray-400 text-sm">
        Protect your enterprise risk data by requiring a time-based code from an authenticator app (like Google Authenticator or Authy) when logging in.
      </p>

      {error && <div className="text-red-400 text-xs font-mono bg-red-950/40 p-2 rounded">{error}</div>}
      {success && <div className="text-green-400 text-xs font-mono bg-green-950/40 p-2 rounded">{success}</div>}

      {!qrCode ? (
        <button
          onClick={handleEnableMFA}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs tracking-wider uppercase transition shadow-lg"
        >
          Generate MFA QR Code
        </button>
      ) : (
        <div className="space-y-6">
          
          {/* Render the Supabase SVG Data injection string inside a standard image container */}
          <div className="bg-white p-4 rounded-lg inline-block">
            <img 
              src={qrCode} 
              alt="MFA Authentication QR Code" 
              className="w-[150px] h-[150px]"
            />
          </div>
          
          <p className="text-xs text-gray-500 font-mono">Scan this with your Authenticator App</p>
          
          <form onSubmit={handleVerifyMFA} className="flex gap-3 max-w-sm">
            <input
              type="text"
              required
              placeholder="Enter 6-digit code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm tracking-widest text-center"
              maxLength={6}
            />
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs tracking-wider uppercase transition"
            >
              Verify
            </button>
          </form>
        </div>
      )}
    </div>
  );
}