'use client';

import { useState } from 'react';
import { supabase } from '../utils/supabase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA State Management Variables
  const [showMFAChallenge, setShowMFAChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [storedFactorId, setStoredFactorId] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage('Registration successful! You can now log in.');
        setIsSignUp(false);
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        const { data: mfaData, error: mfaLevelError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfaLevelError) throw mfaLevelError;

        if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.nextLevel !== mfaData.currentLevel) {
          const factors = await supabase.auth.mfa.listFactors();
          const totpFactor = factors.data?.all?.find(f => f.status === 'verified');

          if (totpFactor) {
            setStoredFactorId(totpFactor.id);
            setShowMFAChallenge(true);
            setLoading(false);
            return; 
          }
        }

        window.location.href = '/';
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: storedFactorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: storedFactorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      });
      if (verify.error) throw verify.error;

      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'MFA verification failed. Access Denied.');
      await supabase.auth.signOut();
      setShowMFAChallenge(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-80px)] bg-gray-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Matching Background Grid & Light Aura Blurs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-gradient-to-b from-gray-900/90 to-gray-950/90 border border-gray-800/80 rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-sm">
        
        <div className="text-center space-y-2 mb-6">
          <span className="px-2.5 py-1 rounded-full bg-blue-950/50 border border-blue-900/40 text-[10px] font-mono text-blue-400 uppercase tracking-widest">
            Gateway Portal
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            {showMFAChallenge 
              ? 'Security Check' 
              : isSignUp ? 'Initialize Account' : 'Command Center'}
          </h1>
        </div>

        {message && <div className="p-4 mb-4 bg-green-950/30 border border-green-800/40 rounded-xl text-xs text-green-400 font-mono">{message}</div>}
        {error && <div className="p-4 mb-4 bg-red-950/30 border border-red-800/40 rounded-xl text-xs text-red-400 font-mono">{error}</div>}

        {showMFAChallenge ? (
          <form onSubmit={handleMFAVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-gray-400 block text-center uppercase tracking-wider">
                Enter 6-Digit Authenticator Token
              </label>
              <input 
                type="text" 
                required
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="000000" 
                className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 focus:outline-none rounded-xl px-4 py-3 text-xl font-bold font-mono tracking-[0.5em] text-center text-white placeholder:text-gray-800 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-emerald-800 text-white font-bold rounded-xl transition text-xs tracking-wider uppercase shadow-lg shadow-emerald-950/20"
            >
              {loading ? 'Verifying...' : 'Confirm Identity'}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Operator Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@enterprise.com" 
                  className="w-full bg-gray-950/60 border border-gray-800 focus:border-blue-500 focus:outline-none rounded-xl px-4 py-3 text-sm transition-colors text-white placeholder:text-gray-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Security Clearance Token</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-gray-950/60 border border-gray-800 focus:border-blue-500 focus:outline-none rounded-xl px-4 py-3 text-sm transition-colors text-white placeholder:text-gray-700"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-blue-800 text-white font-bold rounded-xl transition text-xs tracking-wider uppercase shadow-lg shadow-blue-950/20"
              >
                {loading ? 'Processing...' : isSignUp ? 'Create Profile' : 'Request Access'}
              </button>
            </form>

            <div className="text-center pt-4 border-t border-gray-900 mt-4">
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-gray-500 hover:text-blue-400 transition-colors font-medium"
              >
                {isSignUp ? 'Already registered? Access Terminal' : 'Need authorization? Register new operator'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}