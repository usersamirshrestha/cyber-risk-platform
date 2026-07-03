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
        // 1. Run primary credentials check (AAL1 level validation)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        // 2. Query user's MFA assurance state to check for active factor setups
        const { data: mfaData, error: mfaLevelError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfaLevelError) throw mfaLevelError;

        // If the user has setup MFA, their next level is 'aal2' but they are currently at 'aal1'
        if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.nextLevel !== mfaData.currentLevel) {
          const factors = await supabase.auth.mfa.listFactors();
          const totpFactor = factors.data?.all?.find(f => f.status === 'verified');

          if (totpFactor) {
            setStoredFactorId(totpFactor.id);
            setShowMFAChallenge(true); // Switch view component state to request the token
            setLoading(false);
            return; 
          }
        }

        // If no MFA is active, grant direct access to dashboard workspace
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  // Separate validation routine to check the 6-digit authenticator app code
  const handleMFAVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Initialize a validation session challenge token matching the factor ID
      const challenge = await supabase.auth.mfa.challenge({ factorId: storedFactorId });
      if (challenge.error) throw challenge.error;

      // 2. Transmit verification parameters down to Supabase's auth pipeline
      const verify = await supabase.auth.mfa.verify({
        factorId: storedFactorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      });
      if (verify.error) throw verify.error;

      // Success: User reaches AAL2 clearance level status
      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'MFA verification failed. Access Denied.');
      await supabase.auth.signOut(); // Wipe session states on failure for safety
      setShowMFAChallenge(false); // Reset to base screen state
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        <div className="text-center">
          <p className="text-blue-500 font-mono text-xs uppercase tracking-widest mb-1">Gateway Terminal</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {showMFAChallenge 
              ? 'Security Verification' 
              : isSignUp ? 'Create Operator Profile' : 'Command Center Access'}
          </h1>
        </div>

        {message && <div className="p-4 bg-green-950/40 border border-green-500/30 rounded-lg text-sm text-green-400 font-medium">{message}</div>}
        {error && <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-lg text-sm text-red-400 font-medium font-mono">{error}</div>}

        {/* Dynamic View Check: Display the MFA token code entry field OR standard user authentication form */}
        {showMFAChallenge ? (
          <form onSubmit={handleMFAVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-400 block text-center">
                Enter 6-Digit Authenticator Token
              </label>
              <input 
                type="text" 
                required
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="000000" 
                className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 focus:outline-none rounded-lg px-4 py-3 text-lg font-bold font-mono tracking-widest text-center text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-bold rounded-lg transition text-xs tracking-wider uppercase"
            >
              {loading ? 'Validating Token Profile...' : 'Verify Token & Mount System'}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Operator Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@enterprise.com" 
                  className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 focus:outline-none rounded-lg px-4 py-3 text-sm transition text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Security Clearance Token (Password)</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 focus:outline-none rounded-lg px-4 py-3 text-sm transition text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold rounded-lg transition text-xs tracking-wider uppercase"
              >
                {loading ? 'Processing Cryptographic Handshake...' : isSignUp ? 'Initialize Profile' : 'Request Access'}
              </button>
            </form>

            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-gray-500 hover:text-blue-400 font-semibold transition"
              >
                {isSignUp ? 'Already registered? Access Terminal' : 'Need clearance? Register new operator'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}