'use client';

import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';
// Import Lucide Icons for high-fidelity enterprise styling
import { 
  ShieldAlert, 
  CheckCircle2, 
  Lock, 
  Building2, 
  Activity, 
  FileText, 
  Check,
  HelpCircle,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Layers
} from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- CORE SYSTEM QUESTIONS (SUPABASE LIVE STATE) ---
  const [allQuestions, setAllQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentDomain, setCurrentDomain] = useState('Identity & Access');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // --- CONDITIONAL ADAPTIVE ROUTING STATE ---
  const [inConditionalBranch, setInConditionalBranch] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('Technology');
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Hardcoded fallback deep dives mapping directly to framework rules
  const educationalHooks = {
    MFA_CONTROL: {
      text: "Since multi-factor configurations are unverified or partial, are you at least enforcing administrative IP whitelisting or secure context access loops?",
      hook: "💡 Technical Insight: Perimeter access should layer controls. If cryptographic tokens aren't ready, access parameters must restrict physical ingress zones to mitigate unauthorized credential usage."
    },
    FIREWALL_CONTROL: {
      text: "Given perimeter vulnerabilities, do your origin network nodes block direct public ingress traffic completely?",
      hook: "💡 Technical Insight: Attackers systematically scrape open network protocols. Obscuring infrastructure origin records stops automated Layer 7 HTTP exploits from reaching resource roots."
    }
  };

  useEffect(() => {
    async function initializeSecureSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }
        setUser(session.user);

        // Fetch dynamic baseline parameters from production schema with relation hooks
        const { data: frameworkRows, error: fetchErr } = await supabase
          .from('risk_framework')
          .select(`
            id,
            domain,
            question_text,
            risk_weight,
            remediation_vault (
              technical_context,
              action_item,
              strategy_blueprint
            )
          `)
          .order('created_at', { ascending: true });

        if (fetchErr) throw fetchErr;
        setAllQuestions(frameworkRows);

        const initialMap = {};
        frameworkRows.forEach(q => { initialMap[q.id] = ''; });
        setAnswers(initialMap);
      } catch (err) {
        console.error('Core hydration execution failure:', err);
      } finally {
        setLoading(false);
      }
    }
    initializeSecureSession();
  }, []);

  const filteredQuestions = allQuestions.filter(
    q => q.domain?.toUpperCase() === currentDomain?.toUpperCase()
  );
  const activeQuestion = filteredQuestions[currentIndex];

  // ORDERED DOMAIN ARRAY FOR AUTO-ADVANCING TABS
  const domainSequence = ['Identity & Access', 'Network Security', 'Incident Response'];

  const handleProcessAnswer = (chosenOption) => {
    if (!activeQuestion) return;

    setAnswers(prev => ({ ...prev, [activeQuestion.id]: chosenOption }));

    const hookKey = (activeQuestion?.risk_weight >= 4) ? 'MFA_CONTROL' : 'FIREWALL_CONTROL';
    const currentBranchHook = educationalHooks[hookKey];

    if ((chosenOption === 'No' || chosenOption === 'Partial') && activeQuestion.remediation_vault && !inConditionalBranch) {
      setInConditionalBranch(true);
    } else {
      setInConditionalBranch(false);
      
      // If there are more questions in this domain, step forward
      if (currentIndex < filteredQuestions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // AUTOMATIC TAB JUMPING LOGIC
        const nextDomainIndex = domainSequence.indexOf(currentDomain) + 1;
        if (nextDomainIndex < domainSequence.length) {
          setCurrentDomain(domainSequence[nextDomainIndex]);
          setCurrentIndex(0);
        } else {
          // End of all questions across all domains reached
          alert("All evaluation domains fully compiled! Ready to vault database tokens.");
        }
      }
    }
  };

  const calculateDynamicScore = () => {
    let totalWeight = 0;
    let earnedWeight = 0;
    let counted = 0;

    allQuestions.forEach(q => {
      const selection = answers[q.id];
      if (selection) {
        counted++;
        totalWeight += q.risk_weight;
        if (selection === 'Yes') earnedWeight += q.risk_weight;
        else if (selection === 'Partial') earnedWeight += (q.risk_weight * 0.5);
      }
    });

    if (counted === 0) return null;
    return Math.round((earnedWeight / totalWeight) * 100);
  };

  const generateRemediationAdvice = () => {
    const adviceList = [];
    allQuestions.forEach(q => {
      const answer = answers[q.id];
      if (answer === 'No' || answer === 'Partial') {
        const vault = q.remediation_vault || {};
        adviceList.push({
          id: q.id,
          domain: q.domain,
          control: q.question_text,
          severity: q.risk_weight >= 4 ? 'CRITICAL HIGH' : 'MEDIUM RISK',
          technicalContext: vault.technical_context || 'Non-alignment with framework criteria.',
          actionItem: vault.action_item || 'Conduct an immediate control check gap review.',
          strategy: vault.strategy_blueprint || 'Review architecture metrics configuration.',
          status: answer
        });
      }
    });
    return adviceList;
  };

  const handleSubmitAuditToDatabase = async () => {
    setIsSubmitting(true);
    try {
      const { data: compProfile, error: compErr } = await supabase
        .from('companies')
        .insert([{ name: companyName, industry: companyIndustry, size: 'Enterprise', user_id: user.id }])
        .select().single();

      if (compErr) throw compErr;

      const transactions = allQuestions.map(q => ({
        company_id: compProfile.id,
        question_id: q.id,
        answer: answers[q.id] || 'No'
      }));

      const { error: insertErr } = await supabase.from('audit_responses').insert(transactions);
      if (insertErr) throw insertErr;

      setSubmitSuccess(true);
    } catch (err) {
      alert(`Database Vault Failure: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentScore = calculateDynamicScore();
  const remediationItems = generateRemediationAdvice();

  // --- TAILWIND SKELETON LOADERS INTERCEPT ---
  if (loading) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-gray-950 text-white p-6 md:p-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {!workspaceInitialized ? (
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-xl space-y-6 max-w-xl mx-auto mt-12 animate-pulse">
              <div className="space-y-3 flex flex-col items-center">
                <div className="h-4 bg-gray-800 rounded w-1/4"></div>
                <div className="h-6 bg-gray-800 rounded w-2/3 mt-1"></div>
                <div className="h-3 bg-gray-800 rounded w-5/6 mt-2"></div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="h-3 bg-gray-800 rounded w-1/3"></div>
                  <div className="h-11 bg-gray-950 border border-gray-850 rounded-lg w-full"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-800 rounded w-1/4"></div>
                  <div className="h-11 bg-gray-950 border border-gray-850 rounded-lg w-full"></div>
                </div>
              </div>
              <div className="h-11 bg-gray-800 rounded-xl w-full mt-2"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-2">
                  <div className="h-8 bg-gray-800 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-800 rounded w-1/4"></div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="h-6 bg-gray-800 rounded w-24"></div>
                        <div className="h-4 bg-gray-800 rounded w-16"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-800 rounded w-full"></div>
                        <div className="h-4 bg-gray-800 rounded w-5/6"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="h-9 bg-gray-950 rounded-lg"></div>
                        <div className="h-9 bg-gray-950 rounded-lg"></div>
                        <div className="h-9 bg-gray-950 rounded-lg"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center space-y-4">
                  <div className="h-5 bg-gray-800 rounded w-1/2"></div>
                  <div className="w-36 h-36 rounded-full bg-gray-950 border-4 border-gray-800 flex items-center justify-center">
                    <div className="w-20 h-8 bg-gray-900 rounded"></div>
                  </div>
                </div>
                <div className="bg-gray-900/40 border border-gray-850 border-dashed rounded-xl p-8 h-48 flex flex-col items-center justify-center space-y-3">
                  <div className="w-6 h-6 rounded-full bg-gray-800"></div>
                  <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // --- FIXED: RENDER HIGH-FIDELITY MARKETING DECK FOR UNAUTHENTICATED GUESTS ---
  if (!user) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-gradient-to-b from-blue-600/10 to-indigo-600/0 rounded-full blur-[140px] pointer-events-none"></div>

        {/* HERO SECTION */}
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

        {/* MOCK PLATFORM PREVIEW */}
        <section className="max-w-6xl mx-auto px-6 pb-28 relative z-10">
          <div className="bg-gradient-to-b from-gray-800/50 to-gray-900/20 border border-gray-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60"></span>
                <span className="ml-2">compliance_engine_core.io</span>
              </div>
              <div className="text-[10px] bg-emerald-950/60 border border-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                SECURITY SHIELD LIVE
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-950 p-5 rounded-xl border border-gray-900 space-y-2">
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">MFA Authorization Gate</p>
                <p className="text-xl font-bold text-white flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-400 stroke-[2.5]" /> Enforced (AAL2 Level)
                </p>
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

        {/* FEATURE INFORMATION DECK */}
        <section id="features" className="max-w-7xl mx-auto px-6 pb-32 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 scroll-mt-24">
          <div className="p-6 bg-gray-900/30 border border-gray-850 rounded-xl space-y-3">
            <span className="w-10 h-10 rounded-lg bg-blue-950/50 border border-blue-900/40 flex items-center justify-center text-blue-400">
              <Lock className="w-5 h-5 stroke-[2]" />
            </span>
            <h3 className="text-base font-bold">Hardened MFA Verification</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Enforce time-based, app-driven authorization profiles. Protect configuration dashboards using automated sessions backed by secure challenge routines.
            </p>
          </div>
          <div className="p-6 bg-gray-900/30 border border-gray-850 rounded-xl space-y-3">
            <span className="w-10 h-10 rounded-lg bg-blue-950/50 border border-blue-900/40 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5 stroke-[2]" />
            </span>
            <h3 className="text-base font-bold">Isolated Tenant Charting</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Segregate enterprise timeline records cleanly using dynamic drop-down filters. Map chronological risk vectors independently across individual target entities.
            </p>
          </div>
          <div className="p-6 bg-gray-900/30 border border-gray-850 rounded-xl space-y-3">
            <span className="w-10 h-10 rounded-lg bg-blue-950/50 border border-blue-900/40 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5 stroke-[2]" />
            </span>
            <h3 className="text-base font-bold">Remediation Data Pipelines</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Instantly converts structural infrastructure design failures into distinct implementation guidelines, strategy roadmaps, and validation criteria.
            </p>
          </div>
        </section>
      </main>
    );
  }

  // --- REGULAR AUTHENTICATED SYSTEM FLOW ---
  return (
    <main className="min-h-[calc(100vh-80px)] bg-gray-950 text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        {!workspaceInitialized ? (
          /* WORKSPACE DISCOVERY INITIALIZATION MODAL */
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-xl mx-auto space-y-6 shadow-xl mt-12">
            <div className="text-center space-y-1">
              <span className="text-blue-500 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Initialize Operational Profile
              </span>
              <h2 className="text-lg font-bold">Register Company Metadata</h2>
            </div>
            <div className="space-y-4">
              <input 
                type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none text-white"
                placeholder="Organization Legal Title"
              />
              <select 
                value={companyIndustry} onChange={e => setCompanyIndustry(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none text-white"
              >
                <option value="Technology">Technology Frameworks</option>
                <option value="Finance">Fintech Operational Matrix</option>
              </select>
              <button 
                onClick={() => { if(companyName.trim()) setWorkspaceInitialized(true); }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold uppercase text-xs tracking-wider transition shadow-lg"
              >
                Launch Assessment Engine
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE EXPLOIT ASSESSMENT WORKSPACE */
          <div className="space-y-8 animate-fade-in">
            
            {/* TABS WRAPPER */}
            <div className="flex gap-4 border-b border-gray-900 pb-4 overflow-x-auto">
              {domainSequence.map(domainOpt => (
                <button
                  key={domainOpt}
                  onClick={() => {
                    setCurrentDomain(domainOpt);
                    setCurrentIndex(0);
                    setInConditionalBranch(false);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition shrink-0 ${
                    currentDomain === domainOpt 
                      ? 'bg-blue-600 border border-blue-500 text-white shadow-md' 
                      : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {domainOpt.split(' ')[0]} Engine
                </button>
              ))}
            </div>

            {/* DUAL PANEL LAYOUT FRAMEWORK */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2 space-y-6">
                {submitSuccess ? (
                  <div className="bg-gray-900 border border-green-900/40 p-12 rounded-2xl text-center space-y-4 shadow-xl">
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                    <h2 className="text-xl font-bold">Audit Securely Vaulted</h2>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">Relational transaction blocks successfully compiled and written to database records.</p>
                  </div>
                ) : (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6 shadow-xl relative overflow-hidden">
                    
                    <div className="flex justify-between items-center text-xs font-mono text-gray-500">
                      <span className="uppercase tracking-widest text-[10px] text-blue-400">{currentDomain} Matrix</span>
                      <span>Step {currentIndex + 1} of {filteredQuestions.length || 1}</span>
                    </div>

                    <div className="min-h-[160px] flex flex-col justify-center">
                      {filteredQuestions.length === 0 ? (
                        <p className="text-xs text-gray-500 font-mono italic text-center py-6">Loading framework parameters for this domain...</p>
                      ) : !inConditionalBranch ? (
                        <div className="space-y-3">
                          <h2 className="text-lg font-bold text-gray-100 leading-relaxed flex items-start gap-2.5">
                            <HelpCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            {activeQuestion?.question_text}
                          </h2>
                        </div>
                      ) : (
                        <div className="space-y-4 p-5 bg-gray-950 border border-amber-900/30 rounded-xl animate-fade-in">
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono font-bold">
                            <BookOpen className="w-4 h-4" /> KNOWLEDGE DETOUR CONTEXT
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed italic font-mono">
                            {activeQuestion?.remediation_vault?.technical_context}
                          </p>
                          <h3 className="text-sm font-semibold text-gray-200 leading-relaxed pt-3 border-t border-gray-900">
                            🎯 Recommended Action: {activeQuestion?.remediation_vault?.action_item}
                          </h3>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {['Yes', 'Partial', 'No'].map(opt => (
                        <button
                          key={opt} onClick={() => handleProcessAnswer(opt)}
                          disabled={filteredQuestions.length === 0}
                          className="py-3 bg-gray-950 border border-gray-850 hover:border-gray-700 rounded-xl text-xs font-mono font-bold uppercase transition hover:bg-gray-850 disabled:opacity-20 text-gray-300 hover:text-white"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-950 text-xs font-mono text-gray-500">
                      <button 
                        disabled={currentIndex === 0 && !inConditionalBranch}
                        onClick={() => {
                          if (inConditionalBranch) setInConditionalBranch(false);
                          else setCurrentIndex(prev => Math.max(0, prev - 1));
                        }}
                        className="flex items-center gap-1 hover:text-white transition disabled:opacity-10"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>
                      
                      {currentIndex === filteredQuestions.length - 1 && !inConditionalBranch && filteredQuestions.length > 0 && (
                        <button 
                          onClick={handleSubmitAuditToDatabase} disabled={isSubmitting}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1.5"
                        >
                          Vault Audit Matrix <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                  </div>
                )}
              </div>

              <div className="lg:col-span-1 space-y-6">
                {submitSuccess ? (
                  <>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center space-y-6 shadow-xl animate-fade-in">
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono text-gray-400">Security Rating Matrix</h2>
                      <div className="py-4 flex items-center justify-center">
                        <div className="w-36 h-36 rounded-full border-4 border-gray-800 flex flex-col items-center justify-center bg-gray-950 shadow-inner">
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

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {remediationItems.length === 0 ? (
                          <div className="p-4 bg-green-950/20 border border-green-800/30 text-green-400 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" /> Ideal Alignment: All control profiles meet absolute framework expectations.
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
                  <div className="bg-gray-900/40 border border-gray-850 border-dashed rounded-2xl p-8 text-center text-xs font-mono py-24 text-gray-500 flex flex-col items-center justify-center gap-3 shadow-sm h-full">
                    <Lock className="w-6 h-6 text-gray-600 stroke-[1.5]" />
                    <span>Posture analysis metrics locked. Complete the framework controls evaluation and vault the results to compile your mitigation advisory assets.</span>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}
      </div>
    </main>
  );
}