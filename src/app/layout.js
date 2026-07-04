'use client';

import { useEffect, useState } from 'react';
import { supabase } from './utils/supabase';
import MFASetup from './components/MFASetup'; // Import it here now!
import './globals.css'; 

export default function RootLayout({ children }) {
  const [session, setSession] = useState(null);
  const [showMFAModal, setShowMFAModal] = useState(false); // State to toggle setup dashboard

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
        <nav className="w-full bg-gray-900/40 backdrop-blur-md border-b border-gray-850/80 sticky top-0 z-50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 font-black text-xl tracking-tighter">🔒 CYBERCORE</span>
              <span className="text-[9px] bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded text-gray-500 font-mono">v2.4.0</span>
            </div>
            
            {session ? (
              <div className="flex items-center gap-6">
                <a href="/" className="text-xs font-semibold text-gray-400 hover:text-white transition">Terminal Workspace</a>
                <a href="/analytics" className="text-xs font-semibold text-gray-400 hover:text-white transition">Analytics Engine</a>
                
                {/* Interactive Toggle Trigger for Account Security Options */}
                <button 
                  onClick={() => setShowMFAModal(!showMFAModal)}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition flex items-center gap-1.5"
                >
                  🛡️ Security Controls
                </button>

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

        {/* Global Floating Slide-out Overhaul Drawer Panel for the MFA Setup widget */}
        {session && showMFAModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
            <div className="w-full max-w-md bg-gray-900 border-l border-gray-800 h-full p-6 shadow-2xl relative space-y-6 overflow-y-auto">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Security Architecture</h3>
                  <p className="text-[10px] font-mono text-gray-500 uppercase">Configuration Profiles</p>
                </div>
                <button 
                  onClick={() => setShowMFAModal(false)}
                  className="text-xs px-2.5 py-1 bg-gray-950 hover:bg-gray-800 border border-gray-800 rounded text-gray-400 transition"
                >
                  ✕ Close
                </button>
              </div>
              
              {/* Mounted MFA Component dynamically relocated away from lower blocks */}
              <MFASetup />
            </div>
          </div>
        )}

        {children}
      </body>
    </html>
  );
}