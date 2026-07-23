'use client';

import { useEffect, useState } from 'react';
import { supabase } from './utils/supabase';
import MFASetup from './components/MFASetup';
import './globals.css'; 
import { Lock, Shield, LogOut } from 'lucide-react';


export default function RootLayout({ children }) {
  const [session, setSession] = useState(null);
  const [showMFAModal, setShowMFAModal] = useState(false);
  // Track whether the user has successfully cleared all required security levels
  const [isFullyVerified, setIsFullyVerified] = useState(false);

  useEffect(() => {
    // Helper function to extract and evaluate assurance levels from a session token
    const assessAssuranceLevel = async (currentSession) => {
      if (!currentSession) {
        setIsFullyVerified(false);
        return;
      }

      try {
        // Invoking the correct nested .mfa endpoint method here
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (error) throw error;

        // If the system expects MFA but the user is only at aal1, lock down the header shortcuts
        if (data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
          setIsFullyVerified(false);
        } else {
          // If no further authentication levels are pending, completely unlock the workspace
          setIsFullyVerified(true);
        }
      } catch (err) {
        console.error('Assurance level extraction fault:', err);
        setIsFullyVerified(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      assessAssuranceLevel(initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
      assessAssuranceLevel(activeSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased flex flex-col min-h-screen">
        
        {/* Global Navigation Header */}
        <nav className="w-full bg-gray-900/40 backdrop-blur-md border-b border-gray-850/80 sticky top-0 z-50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            
            <a href="/" className="flex items-center gap-2 group hover:opacity-90 transition">
              <Lock className="w-5 h-5 text-blue-400 stroke-[2.5]" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 font-black text-xl tracking-tighter">
                CYBERCORE
              </span>
              <span className="text-[9px] bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded text-gray-500 font-mono">
                v2.4.0
              </span>
            </a>
            
            {/* Links only mount if the operator has cleared the MFA challenge page */}
            {session && isFullyVerified ? (
              <div className="flex items-center gap-6">
                <a href="/" className="text-xs font-semibold text-gray-400 hover:text-white transition">Terminal Workspace</a>
                <a href="/analytics" className="text-xs font-semibold text-gray-400 hover:text-white transition">Analytics Engine</a>
                
                <button 
                  onClick={() => setShowMFAModal(!showMFAModal)}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition flex items-center gap-1.5"
                >
                  <Shield className="w-4 h-4" />
                  Security Controls
                </button>

                <button 
                  onClick={handleLogout} 
                  className="text-[11px] font-mono px-3 py-1.5 bg-red-950/30 hover:bg-red-950 border border-red-900/40 rounded text-red-400 transition flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>
            ) : session ? (
              /* Restricted disconnect gate when MFA is pending */
              <div className="flex items-center gap-4">
                <span className="text-xs text-amber-400 font-mono flex items-center gap-1.5 animate-pulse">
                  ⚠️ Verification Required
                </span>
                <button 
                  onClick={handleLogout} 
                  className="text-[11px] font-mono px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded text-gray-400 transition"
                >
                  Cancel Sign In
                </button>
              </div>
            ) : (
              /* Unauthenticated Public Links */
              <div className="flex items-center gap-4">
                <a href="/auth" className="text-xs font-bold px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition text-white shadow-md shadow-blue-600/10">
                  Access Portal
                </a>
              </div>
            )}
          </div>
        </nav>

        {/* Floating Slide-out Settings Overhaul Panel Drawer */}
        {session && isFullyVerified && showMFAModal && (
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
              
              <MFASetup />
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1">
          {children}
        </div>

        {/* ENTERPRISE FOOTER BLOCK */}
<footer className="border-t border-gray-900 bg-gray-950 text-gray-500 text-xs font-mono py-8 px-6 print:hidden mt-auto">
  <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
    
    {/* Left Side: Brand & Standard */}
    <div className="flex items-center gap-2">
      <Shield className="w-4 h-4 text-blue-400" />
      <span className="text-gray-300 font-bold tracking-tight text-sm">CyberRiskPlatform</span>
      <span className="text-gray-700">|</span>
      <span>NIST CSF v1.1 Compliant</span>
    </div>

    {/* Center: Live Status Indicators */}
    <div className="flex items-center gap-4 text-[11px]">
      <span className="flex items-center gap-1.5 text-gray-400">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        System Online
      </span>
      <span className="text-gray-800">•</span>
      <span>256-bit Encryption</span>
    </div>

    {/* Right Side: Copyright */}
    <div>
      © {new Date().getFullYear()} CyberRiskPlatform. All rights reserved.
    </div>

  </div>
</footer>

      </body>
    </html>
  );
}