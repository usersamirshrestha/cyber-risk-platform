'use client';

import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';
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
  Layers,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- ADAPTIVE TRACKING STATE ---
  const [techLevel, setTechLevel] = useState(''); // 'Beginner', 'Intermediate', 'Expert'

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

  // Expanded educational contextual hooks fallback database repository
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
      } catch (err) {
        console.error('Session establishment engine failure:', err);
      } finally {
        setLoading(false);
      }
    }
    initializeSecureSession();
  }, []);

  // Hydrate tailored question tracks dynamically from Supabase based on user choice
  const fetchTieredFramework = async (selectedTier) => {
    setLoading(true);
    try {
      const { data: frameworkRows, error: fetchErr } = await supabase
        .from('risk_framework')
        .select(`
          id, domain, question_text, risk_weight,
          remediation_vault (technical_context, action_item, strategy_blueprint)
        `)
        .eq('tier', selectedTier)
        .order('created_at', { ascending: true });

      if (fetchErr) throw fetchErr;

      // Fallback local mock matrices to prevent empty dashboards if database seeds are missing
      if (!frameworkRows || frameworkRows.length === 0) {
        const localFallbacks = {
          Beginner: [
            { id: 'b1', domain: 'Identity & Access', question_text: 'Are basic distinct passwords enforced for every worker account profile?', risk_weight: 3 },
            { id: 'b2', domain: 'Network Security', question_text: 'Is an active commercial anti-virus application installed on all endpoint computers?', risk_weight: 3 }
          ],
          Intermediate: [
            { id: 'm1', domain: 'Identity & Access', question_text: 'Is application-driven Multi-Factor Authentication mandatory for all email profile logons?', risk_weight: 4 },
            { id: 'm2', domain: 'Network Security', question_text: 'Are production services front-faced by an active stateful Web Application Firewall proxy layer?', risk_weight: 4 }
          ],
          Expert: [
            { id: 'e1', domain: 'Identity & Access', question_text: 'Are production database connections limited exclusively to AAL2 sessions via biometrically backed FIDO2 tokens?', risk_weight: 5 },
            { id: 'e2', domain: 'Network Security', question_text: 'Are internal networks micro-segmented inside VPC spaces with absolute cross-subnet explicit denies?', risk_weight: 5 }
          ]
        };
        setAllQuestions(localFallbacks[selectedTier]);
        const initialMap = {};
        localFallbacks[selectedTier].forEach(q => { initialMap[q.id] = ''; });
        setAnswers(initialMap);
      } else {
        setAllQuestions(frameworkRows);
        const initialMap = {};
        frameworkRows.forEach(q => { initialMap[q.id] = ''; });
        setAnswers(initialMap);
      }
      setWorkspaceInitialized(true);
    } catch (err) {
      console.error('Dynamic hydration execution path error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrack = (selectedTier) => {
    setTechLevel(selectedTier);
    fetchTieredFramework(selectedTier);
  };

  const filteredQuestions = allQuestions.filter(
    q => q.domain?.toUpperCase() === currentDomain?.toUpperCase()
  );
  const activeQuestion = filteredQuestions[currentIndex];
  const domainSequence = ['Identity & Access', 'Network Security', 'Incident Response'];

  const handleProcessAnswer = (chosenOption) => {
    if (!activeQuestion) return;
    setAnswers(prev => ({ ...prev, [activeQuestion.id]: chosenOption }));

    if ((chosenOption === 'No' || chosenOption === 'Partial') && activeQuestion.remediation_vault && !inConditionalBranch) {
      setInConditionalBranch(true);
    } else {
      setInConditionalBranch(false);
      if (currentIndex < filteredQuestions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        const nextDomainIndex = domainSequence.indexOf(currentDomain) + 1;
        if (nextDomainIndex < domainSequence.length) {
          setCurrentDomain(domainSequence[nextDomainIndex]);
          setCurrentIndex(0);
        } else {
          alert(`Framework assessment matrix complete for track: ${techLevel}!`);
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
          id: q.id, domain: q.domain, control: q.question_text,
          severity: q.risk_weight >= 4 ? 'CRITICAL HIGH' : 'MEDIUM RISK',
          technicalContext: vault.technical_context || 'Non-alignment with custom baseline controls parameters.',
          actionItem: vault.action_item || 'Conduct an immediate internal control gap review checklist verification.',
          strategy: vault.strategy_blueprint || 'Review architecture metrics configuration schematics log vectors.',
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
        .insert([{ name: companyName, industry: companyIndustry, size: `${techLevel} Level Track`, user_id: user.id }])
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
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-xl space-y-6 max-w-xl mx-auto mt-12 animate-pulse">
            <div className="space-y-3 flex flex-col items-center"><div className="h-4 bg-gray-800 rounded w-1/4"></div><div className="h-6 bg-gray-800 rounded w-2/3"></div></div>
            <div className="space-y-4 pt-2"><div className="h-11 bg-gray-950 border border-gray-850 rounded-lg w-full"></div><div className="h-11 bg-gray-950 border border-gray-850 rounded-lg w-full"></div></div>
            <div className="h-11 bg-gray-800 rounded-xl w-full"></div>
          </div>
        </div>
      </main>
    );
  }

  // --- PUBLIC MARKETING DECK FOR GUESTS ---
  if (!user) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
        <section className="max-w-7xl mx-auto px-6 pt-28 pb-20 relative z-10 text-center space-y-8">
          <div className="space-y-4 max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-[11px] font-mono text-blue-400 uppercase tracking-wider">
              Adaptive GRC Infrastructure Architecture Ecosystem Ready
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
              Continuous Governance.<br />Instant Remediation.
            </h1>
            <p className="text-gray-400 text-sm md:text-xl max-w-2xl mx-auto leading-relaxed pt-2">
              Quantify infrastructure control alignment, toggle tailored engineering tiers, and map custom security blueprints seamlessly.
            </p>
          </div>
          <div className="flex justify-center items-center pt-4">
            <a href="/auth" className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 font-bold rounded-xl text-xs tracking-wider uppercase transition text-center shadow-lg shadow-blue-500/10">
              Deploy Workspace Portal
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-gray-950 text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        {!workspaceInitialized ? (
          /* WORKSPACE DISCOVERY ONBOARDING & TIER SELECTION */
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            
            {/* Metadata inputs */}
            {techLevel === '' ? (
              <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-xl mx-auto space-y-6 shadow-xl mt-12">
                <div className="text-center space-y-1">
                  <span className="text-blue-500 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Stage 01: Workspace Mapping
                  </span>
                  <h2 className="text-lg font-bold">Register Profile Information</h2>
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
                    onClick={() => { if(!companyName.trim()) return alert('Input valid name.'); setTechLevel('Selecting'); }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold uppercase text-xs tracking-wider transition"
                  >
                    Choose Architecture Track
                  </button>
                </div>
              </div>
            ) : (
              /* NEW INTERACTIVE TIER CARDS CHOICE ROUTE */
              <div className="space-y-6 text-center">
                <div className="space-y-1">
                  <span className="text-amber-400 font-mono text-[10px] uppercase tracking-widest block">Stage 02: Framework Tier Allocation</span>
                  <h2 className="text-2xl font-black">Select Your Operational Security Level</h2>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">Choose a control scope that targets your current technical deployment footprint.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  {/* Beginner Card */}
                  <button 
                    onClick={() => handleSelectTrack('Beginner')}
                    className="bg-gray-900 border border-gray-800 hover:border-gray-700 p-6 rounded-2xl text-left space-y-4 group transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-green-950/50 border border-green-900/40 flex items-center justify-center text-green-400">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-blue-400 transition">Foundational Hygiene</h4>
                        <p className="text-[10px] font-mono uppercase text-green-400">Beginner Track</p>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">Focuses on critical entry baseline measures like distinct password management policies and offsite backup patterns.</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 font-mono group-hover:text-white transition pt-4">Select Baseline &rarr;</span>
                  </button>

                  {/* Intermediate Card */}
                  <button 
                    onClick={() => handleSelectTrack('Intermediate')}
                    className="bg-gray-900 border border-gray-800 hover:border-gray-700 p-6 rounded-2xl text-left space-y-4 group transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-950/50 border border-blue-900/40 flex items-center justify-center text-blue-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-blue-400 transition">Standard GRC Alignment</h4>
                        <p className="text-[10px] font-mono uppercase text-blue-400">Intermediate Track</p>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">Applies standard compliance controls including app-based MFA enforcement, perimeter WAF setups, and formal incident plans.</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 font-mono group-hover:text-white transition pt-4">Select Standard &rarr;</span>
                  </button>

                  {/* Expert Card */}
                  <button 
                    onClick={() => handleSelectTrack('Expert')}
                    className="bg-gray-900 border border-gray-800 hover:border-gray-700 p-6 rounded-2xl text-left space-y-4 group transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-950/50 border border-purple-900/40 flex items-center justify-center text-purple-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-blue-400 transition">Hardened Zero-Trust</h4>
                        <p className="text-[10px] font-mono uppercase text-purple-400">Expert Track</p>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">Tailored for complex cloud-native architectures enforcing FIDO2 keys, strict network micro-segmentation, and live SIEM log pipelines.</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 font-mono group-hover:text-white transition pt-4">Select Zero-Trust &rarr;</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE TAILORED ASSESSMENT WORKSPACE */
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-900 pb-4 gap-4">
              <div className="flex gap-3 overflow-x-auto">
                {domainSequence.map(domainOpt => (
                  <button
                    key={domainOpt} onClick={() => { setCurrentDomain(domainOpt); setCurrentIndex(0); setInConditionalBranch(false); }}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition shrink-0 ${
                      currentDomain === domainOpt ? 'bg-blue-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400'
                    }`}
                  >
                    {domainOpt.split(' ')[0]} Engine
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-mono px-3 py-1 bg-blue-950/60 border border-blue-900 text-blue-400 rounded-full font-bold uppercase tracking-wider self-start md:self-auto">
                Assigned Track: {techLevel}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {submitSuccess ? (
                  <div className="bg-gray-900 border border-green-900/40 p-12 rounded-2xl text-center space-y-4 shadow-xl">
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                    <h2 className="text-xl font-bold">Audit Securely Vaulted</h2>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">Results saved for verification analytics reviews.</p>
                  </div>
                ) : (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6 shadow-xl relative">
                    <div className="flex justify-between items-center text-xs font-mono text-gray-500">
                      <span className="uppercase text-blue-400">{currentDomain} Matrix</span>
                      <span>Step {currentIndex + 1} of {filteredQuestions.length || 1}</span>
                    </div>
                    <div className="min-h-[160px] flex flex-col justify-center">
                      {filteredQuestions.length === 0 ? (
                        <p className="text-xs text-gray-500 font-mono italic text-center">Loading live matrix points parameters...</p>
                      ) : !inConditionalBranch ? (
                        <h2 className="text-lg font-bold text-gray-100 flex items-start gap-2.5">
                          <HelpCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                          {activeQuestion?.question_text}
                        </h2>
                      ) : (
                        <div className="space-y-4 p-5 bg-gray-950 border border-amber-900/30 rounded-xl">
                          <p className="text-xs text-gray-400 italic font-mono">{activeQuestion?.remediation_vault?.technical_context || "Context loaded dynamically."}</p>
                          <h3 className="text-sm font-semibold text-gray-200">🎯 Action Item: {activeQuestion?.remediation_vault?.action_item || "Review configuration logs."}</h3>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {['Yes', 'Partial', 'No'].map(opt => (
                        <button key={opt} onClick={() => handleProcessAnswer(opt)} className="py-3 bg-gray-950 border border-gray-850 hover:border-gray-700 rounded-xl text-xs font-mono font-bold uppercase transition text-gray-300 hover:text-white">{opt}</button>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-950 text-xs font-mono text-gray-500">
                      <button disabled={currentIndex === 0 && !inConditionalBranch} onClick={() => { if(inConditionalBranch) setInConditionalBranch(false); else setCurrentIndex(prev => Math.max(0, prev - 1)); }} className="flex items-center gap-1 disabled:opacity-10"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
                      {currentIndex === filteredQuestions.length - 1 && !inConditionalBranch && filteredQuestions.length > 0 && (
                        <button onClick={handleSubmitAuditToDatabase} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider shadow-md">Vault Audit Matrix</button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-1 space-y-6">
                {submitSuccess ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center space-y-6 shadow-xl">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider font-mono">Security Rating Matrix</h2>
                    <div className="py-4 flex items-center justify-center">
                      <div className="w-36 h-36 rounded-full border-4 border-gray-800 flex flex-col items-center justify-center bg-gray-950">
                        <span className={`text-4xl font-black ${currentScore >= 80 ? 'text-green-400' : currentScore >= 50 ? 'text-yellow-400' : 'text-red-500'}`}>{currentScore}%</span>
                        <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest mt-1">Score Index</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900/40 border border-gray-850 border-dashed rounded-2xl p-8 text-center text-xs font-mono py-24 text-gray-500 flex flex-col items-center justify-center gap-3 shadow-sm h-full">
                    <Lock className="w-6 h-6 text-gray-600 stroke-[1.5]" />
                    <span>Posture analysis metrics locked until track completion.</span>
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