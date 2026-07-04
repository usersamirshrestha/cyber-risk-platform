'use client';

import { useEffect, useState } from 'react';
import { supabase } from './utils/supabase';
import './globals.css'; 

export default function RootLayout({ children }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">
        {/* Global Navigation Header */}
        <nav className="w-full bg-gray-900/40 backdrop-blur-md border-b border-gray-850/80 sticky top-0 z-50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 font-black text-xl tracking-tighter">🔒 CYBERCORE</span>
              <span className="text-[9px] bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded text-gray-500 font-mono">v2.4.0</span>
            </div>
            
            {/* Conditional Links: Only render shortcuts if a valid operator session exists */}
            {session ? (
              <div className="flex items-center gap-6">
                <a href="/" className="text-xs font-semibold text-gray-400 hover:text-white transition">Terminal Workspace</a>
                <a href="/analytics" className="text-xs font-semibold text-gray-400 hover:text-white transition">Analytics Engine</a>
                <button 
                  onClick={handleLogout} 
                  className="text-[11px] font-mono px-3 py-1.5 bg-red-950/30 hover:bg-red-950 border border-red-900/40 rounded text-red-400 transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <a href="/auth" className="text-xs font-bold px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition text-white shadow-md shadow-blue-600/10">
                  Access Portal
                </a>
              </div>
            )}
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}