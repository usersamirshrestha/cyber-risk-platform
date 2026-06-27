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
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        window.location.href = '/'; // Redirect to dashboard on success
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
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
            {isSignUp ? 'Create Operator Profile' : 'Command Center Access'}
          </h1>
        </div>

        {message && <div className="p-4 bg-green-950/40 border border-green-500/30 rounded-lg text-sm text-green-400 font-medium">{message}</div>}
        {error && <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-lg text-sm text-red-400 font-medium font-mono">{error}</div>}

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
      </div>
    </main>
  );
}