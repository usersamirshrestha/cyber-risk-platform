'use client';

import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';
import MFASetup from './components/MFASetup';

export default function Home() {
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('Technology'); 
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false); 
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
        let technicalContext = '';
        
        if (q.domain === 'IDENTITY & ACCESS') {
          technicalContext = 'Unenforced or weak authentication methods leave administrative panels vulnerable to credential stuffing, brute-force algorithms, and session hijacking vectors.';
          actionItem = 'Enforce Hardware/App-Based MFA immediately across all cloud dashboards, corporate email profiles, and SSH production entry points.';
          strategy = 'Deploy a centralized Identity Provider (IDP) such as Okta or Microsoft Entra ID. Configure Conditional Access Policies that completely block authentication attempts unless validated by a biometric FIDO2 key or a TOTP authenticator token hook.';
        } else if (q.domain === 'NETWORK SECURITY' && q.question_text.includes('Firewall')) {
          technicalContext = 'Directly exposing origin server IP addresses allows malicious actors to bypass standard network security controls, opening the door to massive Layer 7 HTTP flood attacks, SQL injections, and Cross-Site Scripting (XSS).';
          actionItem = 'Deploy an Enterprise Cloud-Native Web Application Firewall (WAF) to front-face all public service records.';
          strategy = 'Route your root public domains through a proxy network like Cloudflare Enterprise or AWS WAF. Configure rigid edge rules to analyze incoming HTTP packet structures, drop malicious payloads before they hit your compute instances, and obscure your real infrastructure IPs.';
        } else if (q.domain === 'NETWORK SECURITY') {
          technicalContext = 'A flat network topology means that if a single office workstation is compromised by malware, the attacker can freely move laterally across the internal network to access your live production databases.';
          actionItem = 'Isolate core relational databases and production compute clusters into private network subnets.';
          strategy = 'Re-architect your cloud environment using VPC (Virtual Private Cloud) structural isolation. Implement strict Virtual Firewalls / Security Groups that block all inbound connectivity to production servers except for specific, white-listed application gateway nodes using micro-segmentation principles.';
        } else if (q.domain === 'INCIDENT RESPONSE' && q.question_text.includes('Plan')) {
          technicalContext = 'Without a formalized containment strategy, organizations experience massive delays during a security breach, resulting in higher data loss, severe operational downtime, and legal compliance penalties.';
          actionItem = 'Draft an executive Incident Response Plan (IRP) and establish an operational chain-of-command matrix.';
          strategy = 'Document explicit playbooks for distinct attack vectors (e.g., Ransomware, Data Breach). Assign strict personnel roles (Commander, Comms Lead, Legal Council) and schedule a bi-annual tabletop simulation exercise to pressure-test your disaster recovery recovery time objectives (RTO).';
        } else if (q.domain === 'INCIDENT RESPONSE') {
          technicalContext = 'Silent failures and unmonitored server access logs mean an adversary could live inside your corporate environment for months undetected, slowly exfiltrating sensitive business records.';
          actionItem = 'Establish real-time audit trail and system log ingestion into a centralized, managed SIEM platform.';
          strategy = 'Install telemetry agents (e.g., Datadog, AWS CloudTrail, Splunk) across all cloud provider backplanes, application servers, and gateway routers. Configure continuous correlation rules and anomaly detection alerts to flag unexpected root access modifications instantly via webhooks.';
        } else {
          technicalContext = 'Non-alignment with established cybersecurity framework parameters increases the attack surface and exposes the organization to systemic control oversights.';
          actionItem = 'Conduct an immediate gap analysis review against standard control frameworks to mitigate this specific infrastructure vulnerability.';
          strategy = 'Review configuration matrices, update structural system architecture schematics, and ensure operational logs align directly with essential security baseline criteria.';
        }

        adviceList.push({
          id: q.id,
          domain: q.domain,
          control: q.question_text,
          severity: q.risk_weight >= 4 ? 'CRITICAL HIGH' : 'MEDIUM RISK',
          technicalContext,
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
      <main className="min-h-[calc(100vh-80px)] bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-gradient-to-b from-blue-600/10 to-indigo-600/0 rounded-full blur-[140px] pointer-events-none"></div>

        <section className="max-w-7xl mx-auto px-6 pt-28 pb-20 relative z-10 text-center space-y-8">
          <div className="space-y-4 max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-[11px] font-mono text-blue-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              The Operating System for Cyber Risk Management
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
              Continuous Governance.<br />Instant Remediation.
            </h1>
            <p className="text-gray-400 text-sm md:text-xl max-w-2xl mx-auto leading-relaxed pt-2">
              Ditch fragile legacy spreadsheets. Quantify infrastructure control alignment, enforce app-based multi-factor authentication loops, and map automated threat strategies seamlessly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto pt-4">
            <a href="/auth" className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 font-bold rounded-xl text-xs tracking-wider uppercase transition shadow-lg shadow-blue-500/20 text-center">
              Deploy Workspace Portal
            </a>
            <a href="#features" className="w-full sm:w-auto px-8 py-3.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 font-bold rounded-xl text-xs tracking-wider uppercase transition text-gray-300 text-center">
              View Architecture
            </a>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-28 relative z-10">
          <div className="bg-gradient-to-b from-gray-800/50 to-gray-900/20 border border-gray-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60"></span>
                <span className="ml-2">compliance_engine_core.io</span>
              </div>
              <div className="text-[10px] bg-emerald-950/60 border border-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider animate-pulse">
                ● SECURITY SHIELD LIVE
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-950 p-5 rounded-xl border border-gray-900 space-y-2">
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">MFA Authorization Gate</p>
                <p className="text-xl font-bold text-white">✓ Enforced (AAL2 Level)</p>
              </div>
              <div className="bg-gray-950 p-5 rounded-xl border border-gray-900 space-y-2">
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Posture Score Index</p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-blue-400">88% Compliance</p>
                  <div className="w-16 bg-gray-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full w-[88%]"></div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-950 p-5 rounded-xl border border-gray-900 space-y-2">
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Remediation Script Status</p>
                <p className="text-xl font-bold text-emerald-400">0 Critical Vulnerabilities</p>
              </div>
            </div>

            <div className="bg-gray-950 rounded-xl p-5 border border-gray-900 font-mono text-xs space-y-2 text-gray-400">
              <p className="text-gray-600">// Active Blueprint Strategy Tracking</p>
              <p><span className="text-blue-400">DOMAIN:</span> IDENTITY & ACCESS CONTROL</p>
              <p><span className="text-amber-400">WARNING:</span> Unenforced app-based multi-factor credentials discovered on test node endpoints.</p>
              <p><span className="text-emerald-400">STRATEGY:</span> Deploy conditional access rules forcing mandatory cryptographically backed validation tokens.</p>
            </div>
          </div>
        </section>

        <section id="features" className="max-w-7xl mx-auto px-6 pb-32 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div className="p-6 bg-gray-900/30 border border-gray-850 rounded-xl space-y-3">
            <span className="w-10 h-10 rounded-lg bg-blue-950/50 border border-blue-900/40 flex items-center justify-center text-blue-400 text-base">🛡️</span>
            <h3 className="text-base font-bold">Hardened MFA Verification</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Enforce time-based, app-driven authorization profiles. Protect configuration dashboards using automated sessions backed by secure challenge routines.
            </p>
          </div>
          <div className="p-6 bg-gray-900/30 border border-gray-850 rounded-xl space-y-3">
            <span className="w-10 h-10 rounded-lg bg-blue-950/50 border border-blue-900/40 flex items-center justify-center text-blue-400 text-base">📊</span>
            <h3 className="text-base font-bold">Isolated Tenant Charting</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Segregate enterprise timeline records cleanly using dynamic drop-down filters. Map chronological risk vectors independently across individual target entities.
            </p>
          </div>
          <div className="p-6 bg-gray-900/30 border border-gray-850 rounded-xl space-y-3">
            <span className="w-10 h-10 rounded-lg bg-blue-950/50 border border-blue-900/40 flex items-center justify-center text-blue-400 text-base">⚙️</span>
            <h3 className="text-base font-bold">Remediation Data Pipelines</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Instantly converts structural infrastructure design failures into distinct implementation guidelines, strategy roadmaps, and validation criteria.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-gray-950 text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col space-y-1">
                <h1 className="text-3xl font-extrabold tracking-tight">Cyber Risk Evaluation</h1>
                <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                  Target Company: <span className="text-blue-400 font-bold">{companyName}</span> ({companyIndustry})
                </p>
              </div>

              {submitSuccess ? (
                <div className="bg-green-950/30 border border-green-500/40 p-8 rounded-2xl text-center space-y-4">
                  <h2 className="text-2xl font-bold text-green-400">Assessment Vaulted Securely</h2>
                  <p className="text-gray-400 text-sm max-w-md mx-auto">
                    The posture profile data vectors for <span className="text-white font-semibold">{companyName}</span> have been fully processed and written to the immutable relational logging database.
                  </p>
                  <button 
                    onClick={() => { 
                      setSubmitSuccess(false); 
                      setWorkspaceInitialized(false); 
                      setCompanyName(''); 
                      setAnswers({}); 
                    }} 
                    className="mt-4 px-6 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white hover:bg-gray-800 transition"
                  >
                    Conduct New Audit Session
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
            </div>

            <div className="lg:col-span-1 space-y-6">
              

              {submitSuccess ? (
                <>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center space-y-6 shadow-xl animate-fade-in">
                    <h2 className="text-lg font-bold text-white">Generated Security Rating</h2>
                    <div className="py-4 flex items-center justify-center">
                      <div className="w-36 h-36 rounded-full border-4 border-gray-800 flex flex-col items-center justify-center bg-gray-950">
                        <span className={`text-4xl font-black ${currentScore === null ? 'text-gray-600' : currentScore >= 80 ? 'text-green-400' : currentScore >= 50 ? 'text-yellow-400' : 'text-red-500'}`}>
                          {currentScore !== null ? `${currentScore}%` : '--'}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest mt-1">Score Index</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-xl animate-fade-in">
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
                          <div key={item.id} className="p-5 bg-gray-950 border border-gray-850 rounded-xl space-y-3 shadow-md">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-gray-900 border border-gray-800 rounded text-blue-400 uppercase font-mono">
                                {item.domain}
                              </span>
                              <span className={`text-[9px] font-black tracking-wide uppercase px-2 py-0.5 rounded ${
                                item.severity.includes('CRITICAL') ? 'bg-red-950/60 text-red-400 border border-red-900/40' : 'bg-amber-950/60 text-amber-400 border border-amber-900/40'
                              }`}>
                                {item.severity}
                              </span>
                            </div>
                            
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-gray-500 font-mono uppercase">Vulnerability Context:</p>
                              <p className="text-xs text-gray-400 leading-relaxed italic">"{item.technicalContext}"</p>
                            </div>

                            <div className="pt-2 border-t border-gray-900 space-y-0.5">
                              <p className="text-[10px] font-bold text-red-400 font-mono uppercase">Required Action:</p>
                              <p className="text-xs text-gray-200 font-medium leading-relaxed">{item.actionItem}</p>
                            </div>

                            <div className="pt-2 border-t border-gray-900 space-y-0.5">
                              <p className="text-[10px] font-bold text-blue-400 font-mono uppercase">Implementation Blueprint Strategy:</p>
                              <p className="text-[11px] text-gray-400 leading-relaxed font-medium">{item.strategy}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gray-900/40 border border-gray-850 border-dashed rounded-xl p-8 text-center text-gray-500 text-xs font-mono py-20">
                  🔒 Posture analysis metrics locked. Complete the framework controls evaluation and vault the results to compile your mitigation advisory assets.
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}