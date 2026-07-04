'use client';

import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';
import MFASetup from './components/MFASetup';

export default function Home() {
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('Technology'); // New Industry state
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false); // New Onboarding view state
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    async function initializeSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }
        setUser(session.user);

        const { data: frameworkData, error: frameworkErr } = await supabase
          .from('risk_framework')
          .select('*')
          .order('created_at', { ascending: true });

        if (frameworkErr) throw frameworkErr;
        setQuestions(frameworkData);
        
        const initialAnswers = {};
        frameworkData.forEach(q => {
          initialAnswers[q.id] = '';
        });
        setAnswers(initialAnswers);
      } catch (err) {
        setError(err.message || 'Unknown configuration pipeline error');
      } finally {
        setLoading(false);
      }
    }
    initializeSession();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleSelectAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateScore = () => {
    let totalWeight = 0;
    let earnedWeight = 0;
    let answeredCount = 0;

    questions.forEach(q => {
      const answer = answers[q.id];
      if (answer) {
        answeredCount++;
        totalWeight += q.risk_weight;
        if (answer === 'Yes') earnedWeight += q.risk_weight;
        else if (answer === 'Partial') earnedWeight += (q.risk_weight * 0.5);
      }
    });

    if (answeredCount === 0) return null;
    return Math.round((earnedWeight / totalWeight) * 100);
  };

  const generateRemediationAdvice = () => {
    const adviceList = [];

    questions.forEach(q => {
      const answer = answers[q.id];
      if (answer === 'No' || answer === 'Partial') {
        let actionItem = '';
        let strategy = '';
        
        if (q.domain === 'IDENTITY & ACCESS') {
          actionItem = 'Enforce Hardware/App-Based MFA immediately across all cloud/SSH entry points.';
          strategy = 'Deploy a centralized IAM provider (e.g., Okta, Entra ID) and enforce conditional access policies requiring biometric or authenticator tokens.';
        } else if (q.domain === 'NETWORK SECURITY' && q.question_text.includes('Firewall')) {
          actionItem = 'Deploy Cloud-Native Web Application Firewalls (WAF) to front-face services.';
          strategy = 'Route public domains through services like Cloudflare or AWS WAF to block SQL injection and Layer 7 malicious payloads before they hit servers.';
        } else if (q.domain === 'NETWORK SECURITY') {
          actionItem = 'Isolate core DB/Production clusters using granular Virtual Network Subnets.';
          strategy = 'Implement zero-trust network architectures using VPC security groups to block structural connectivity between internal office computers and live production environments.';
        } else if (q.domain === 'INCIDENT RESPONSE' && q.question_text.includes('Plan')) {
          actionItem = 'Draft an executive Incident Response Plan (IRP) and simulate a tabletop exercise.';
          strategy = 'Establish key containment roles, communication paths, and run business continuity drills simulating active backup recovery schedules.';
        } else if (q.domain === 'INCIDENT RESPONSE') {
          actionItem = 'Establish real-time audit metric pipeline ingestion using a managed SIEM solution.';
          strategy = 'Aggregate all cloud provider access trails, server system logs, and firewall traffic streams into a continuous analytics workspace (e.g., Datadog, Splunk).';
        } else {
          actionItem = 'Review standard framework control parameters to fortify this infrastructure gap.';
          strategy = 'Audit system architecture documentation to ensure parameters align directly with essential compliance criteria.';
        }

        adviceList.push({
          id: q.id,
          domain: q.domain,
          control: q.question_text,
          severity: q.risk_weight >= 4 ? 'CRITICAL HIGH' : 'MEDIUM RISK',
          actionItem,
          strategy,
          status: answer
        });
      }
    });

    return adviceList;
  };

  const handleSubmitAudit = async (e) => {
    e.preventDefault();

    const unanswered = questions.some(q => !answers[q.id]);
    if (unanswered) return alert('Please answer all assessment questions.');

    setIsSubmitting(true);
    try {
      const { data: compData, error: compErr } = await supabase
        .from('companies')
        .insert([{ 
          name: companyName, 
          industry: companyIndustry, 
          size: 'Enterprise',
          user_id: user.id 
        }])
        .select()
        .single();

      if (compErr) throw compErr;

      const responseRows = questions.map(q => ({
        company_id: compData.id,
        question_id: q.id,
        answer: answers[q.id]
      }));

      const { error: responseErr } = await supabase
        .from('audit_responses')
        .insert(responseRows);

      if (responseErr) throw responseErr;
      setSubmitSuccess(true);
    } catch (err) {
      alert(`Submission Fault: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentScore = calculateScore();
  const remediationItems = generateRemediationAdvice();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center font-mono text-sm tracking-widest text-gray-500 animate-pulse">
          DECRYPTING SECURITY SESSION...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-500 text-4xl">🔒</div>
          <h1 className="text-2xl font-bold tracking-tight">Access Prohibited</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            This workspace monitors encrypted enterprise security posture metrics. Please authenticate your operator token to mount the workspace dashboard.
          </p>
          <a href="/auth" className="inline-block mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs tracking-wider uppercase transition shadow-lg">
            Authenticate Operator Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div className="text-xs font-mono text-gray-500">
          Operator ID: <span className="text-blue-400">{user.email}</span>
        </div>
        <div className="flex gap-3">
          <a href="/analytics" className="text-xs px-3 py-1.5 bg-blue-950 hover:bg-blue-900 border border-blue-900 rounded-md text-blue-400 font-semibold transition">
            📊 View Platform Analytics
          </a>
          <button onClick={handleLogout} className="text-xs px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-md text-gray-400 font-semibold transition">
            Disconnect Session
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dynamic Switch Condition for Business Owner Onboarding Initialization */}
          {!workspaceInitialized ? (
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-xl space-y-6 shadow-md max-w-xl mx-auto mt-12">
              <div className="text-center">
                <span className="text-blue-500 font-mono text-xs uppercase tracking-widest">System Initialization</span>
                <h2 className="text-xl font-bold mt-1 text-white">Register Workspace Profile</h2>
                <p className="text-xs text-gray-400 mt-2">
                  Before launching your security posture metrics diagnostics, please bind your direct organization metadata.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Legal Business Name</label>
                  <input 
                    type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="e.g., Acme Innovations Ltd"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Industry Vertical</label>
                  <select 
                    value={companyIndustry} onChange={(e) => setCompanyIndustry(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="Technology">Technology & Cloud SaaS</option>
                    <option value="Finance">Fintech & Banking Operations</option>
                    <option value="Healthcare">Healthcare & Biotech Systems</option>
                    <option value="E-commerce">Retail & E-commerce Logistics</option>
                  </select>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => {
                  if (!companyName.trim()) return alert('Please input a valid organization profile title.');
                  setWorkspaceInitialized(true);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs tracking-wider uppercase shadow-lg transition"
              >
                Initialize Secure Workspace
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col space-y-1">
                <h1 className="text-3xl font-extrabold tracking-tight">Cyber Risk Evaluation</h1>
                <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                  Target Company: <span className="text-blue-400 font-bold">{companyName}</span> ({companyIndustry})
                </p>
              </div>

              {submitSuccess ? (
                <div className="bg-green-950/30 border border-green-500/40 p-8 rounded-2xl text-center space-y-4">
                  <h2 className="text-2xl font-bold text-green-400">Assessment Vaulted</h2>
                  <p className="text-gray-400 text-sm max-w-md mx-auto">
                    The posture profile for <span className="text-white font-semibold">{companyName}</span> has been securely processed. Review the live tracking diagnostics layout below or mount a new session.
                  </p>
                  <button onClick={() => { setSubmitSuccess(false); setWorkspaceInitialized(false); setCompanyName(''); }} className="mt-4 px-6 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white hover:bg-gray-800 transition">
                    Conduct New Assessment
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitAudit} className="space-y-6">
                  <div className="space-y-4">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-md">
                        <div className="flex justify-between items-center">
                          <span className="text-xs px-2 py-1 bg-blue-950 text-blue-400 rounded font-bold border border-blue-900/50">{q.domain}</span>
                          <span className="text-xs font-mono text-gray-500">Control #{idx + 1}</span>
                        </div>
                        <p className="text-gray-200 text-sm font-medium leading-relaxed">{q.question_text}</p>
                        <div className="grid grid-cols-3 gap-3">
                          {['Yes', 'Partial', 'No'].map((option) => {
                            const isSelected = answers[q.id] === option;
                            return (
                              <button
                                key={option} type="button" onClick={() => handleSelectAnswer(q.id, option)}
                                className={`py-2 px-3 text-sm font-semibold rounded-lg border transition ${
                                  isSelected 
                                    ? option === 'Yes' ? 'bg-green-950/40 border-green-500 text-green-400' :
                                      option === 'Partial' ? 'bg-yellow-950/40 border-yellow-500 text-yellow-300' : 'bg-red-950/40 border-red-500 text-red-400'
                                    : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800/40'
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm tracking-wider uppercase shadow-lg transition">
                    {isSubmitting ? 'Securing Submissions...' : 'Vault & Finalize Audit'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar: Security Controls & Rating Panel */}
        <div className="lg:col-span-1 space-y-6">
          <MFASetup />

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center space-y-6 shadow-xl">
            <h2 className="text-lg font-bold">Security Rating</h2>
            <div className="py-4 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border-4 border-gray-800 flex flex-col items-center justify-center bg-gray-950">
                <span className={`text-4xl font-black ${currentScore === null ? 'text-gray-600' : currentScore >= 80 ? 'text-green-400' : currentScore >= 50 ? 'text-yellow-400' : 'text-red-500'}`}>
                  {currentScore !== null ? `${currentScore}%` : '--'}
                </span>
                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest mt-1">Score Index</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Active Mitigation Advisory</h3>
              <p className="text-[10px] text-gray-500 font-mono uppercase mt-0.5">Automated Threat Mitigation Blueprint</p>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {remediationItems.length === 0 ? (
                <div className="p-4 bg-green-950/20 border border-green-800/30 text-green-400 rounded-lg text-xs font-medium text-center">
                  ✓ Ideal Alignment: All control profiles meet absolute framework expectations. No vulnerability advisories generated.
                </div>
              ) : (
                remediationItems.map((item) => (
                  <div key={item.id} className="p-4 bg-gray-950 border border-gray-800 rounded-lg space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-900 border border-gray-800 rounded text-gray-400 uppercase font-mono">
                        {item.domain}
                      </span>
                      <span className={`text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5 rounded ${
                        item.severity.includes('CRITICAL') ? 'bg-red-950 text-red-400 border border-red-900/40' : 'bg-yellow-950 text-yellow-400 border border-yellow-900/40'
                      }`}>
                        {item.severity}
                      </span>
                    </div>
                    
                    <div>
                      <p className="text-xs font-bold text-gray-200">Required Action:</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.actionItem}</p>
                    </div>

                    <div className="pt-1.5 border-t border-gray-900">
                      <p className="text-[10px] font-bold text-blue-400 font-mono uppercase">Implementation Strategy:</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed font-medium">{item.strategy}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}