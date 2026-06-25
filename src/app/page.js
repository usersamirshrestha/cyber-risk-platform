'use client';

import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const { data, error: supabaseError } = await supabase
          .from('risk_framework')
          .select('*')
          .order('created_at', { ascending: true });

        if (supabaseError) throw supabaseError;
        setQuestions(data);
        
        // Initialize all questions with an empty string answer
        const initialAnswers = {};
        data.forEach(q => {
          initialAnswers[q.id] = '';
        });
        setAnswers(initialAnswers);
      } catch (err) {
        setError(err.message || 'Unknown network connection failure');
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, []);

  // Handle choice selection
  const handleSelectAnswer = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Real-time Compliance Score Calculation Logic
  const calculateScore = () => {
    let totalWeight = 0;
    let earnedWeight = 0;
    let answeredCount = 0;

    questions.forEach(q => {
      const answer = answers[q.id];
      if (answer) {
        answeredCount++;
        totalWeight += q.risk_weight;
        if (answer === 'Yes') {
          earnedWeight += q.risk_weight;
        } else if (answer === 'Partial') {
          earnedWeight += (q.risk_weight * 0.5); // Half points for partial compliance
        }
      }
    });

    if (answeredCount === 0) return null;
    return Math.round((earnedWeight / totalWeight) * 100);
  };

  // Submit Audit Handler
  const handleSubmitAudit = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('Please enter a company name.');
      return;
    }

    // Check if all questions are answered
    const unanswered = questions.some(q => !answers[q.id]);
    if (unanswered) {
      alert('Please answer all assessment questions before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create a dummy company profile entry first
      const { data: compData, error: compErr } = await supabase
        .from('companies')
        .insert([{ name: companyName, industry: 'Technology', size: 'Enterprise' }])
        .select()
        .single();

      if (compErr) throw compErr;

      // 2. Format responses array for insertion
      const responseRows = questions.map(q => ({
        company_id: compData.id,
        question_id: q.id,
        answer: answers[q.id]
      }));

      // 3. Batch insert answers into audit_responses
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-mono text-sm uppercase tracking-wider">Loading Framework...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-6xl mx-auto border border-red-500/30 p-6 rounded-lg bg-red-950/20">
          <h1 className="text-xl font-bold text-red-400 mb-2">Configuration Fault</h1>
          <p className="text-gray-400 font-mono text-sm">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <p className="text-blue-500 font-mono text-xs uppercase tracking-widest mb-1">Audit Control Panel</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Cyber Risk Evaluation</h1>
          </div>

          {submitSuccess ? (
            <div className="bg-green-950/30 border border-green-500/40 p-8 rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 bg-green-900/50 border border-green-500 text-green-400 text-3xl flex items-center justify-center rounded-full mx-auto">✓</div>
              <h2 className="text-2xl font-bold text-green-400">Assessment Vaulted</h2>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                The security posture matrix for <span className="text-white font-semibold">{companyName}</span> has been calculated and securely stored in your cloud environment.
              </p>
              <button 
                onClick={() => { setSubmitSuccess(false); setCompanyName(''); }}
                className="mt-4 px-6 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg text-sm transition font-medium"
              >
                Conduct New Assessment
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitAudit} className="space-y-6">
              {/* Organization Identification Card */}
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-3 shadow-md">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Target Organization Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Acme Corporation" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 focus:outline-none rounded-lg px-4 py-3 text-white transition placeholder-gray-600"
                />
              </div>

              {/* Questions Loop */}
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-md hover:border-gray-800 transition">
                    <div className="flex justify-between items-center">
                      <span className="text-xs px-2 py-1 bg-blue-950 text-blue-400 rounded font-bold uppercase border border-blue-900/50">
                        {q.domain}
                      </span>
                      <span className="text-xs font-mono text-gray-500">Control #{idx + 1}</span>
                    </div>

                    <p className="text-gray-200 text-sm md:text-base font-medium leading-relaxed">{q.question_text}</p>

                    {/* Controls Choices Segment */}
                    <div className="grid grid-cols-3 gap-3">
                      {['Yes', 'Partial', 'No'].map((option) => {
                        const isSelected = answers[q.id] === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleSelectAnswer(q.id, option)}
                            className={`py-2 px-3 text-sm font-semibold rounded-lg border transition ${
                              isSelected 
                                ? option === 'Yes' ? 'bg-green-950/40 border-green-500 text-green-400' :
                                  option === 'Partial' ? 'bg-yellow-950/40 border-yellow-500 text-yellow-300' :
                                  'bg-red-950/40 border-red-500 text-red-400'
                                : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800/50'
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 transition text-sm tracking-wider uppercase"
              >
                {isSubmitting ? 'Securing Submissions Pipeline...' : 'Vault & Finalize Audit'}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Score Realtime Engine Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-12 bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6 shadow-xl text-center">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Security Rating</h2>
              <p className="text-xs text-gray-500 font-mono uppercase mt-1">Real-time Compliance Index</p>
            </div>

            <div className="relative py-8 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full border-4 border-gray-800 flex flex-col items-center justify-center bg-gray-950 shadow-inner">
                <span className={`text-4xl font-black ${
                  currentScore === null ? 'text-gray-600' :
                  currentScore >= 80 ? 'text-green-400' :
                  currentScore >= 50 ? 'text-yellow-400' : 'text-red-500'
                }`}>
                  {currentScore !== null ? `${currentScore}%` : '--'}
                </span>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">
                  Score
                </span>
              </div>
            </div>

            <div className="text-left text-xs bg-gray-950 rounded-lg p-4 border border-gray-800 space-y-2 text-gray-400 font-medium">
              <div className="flex justify-between"><span className="text-gray-500">Framework:</span> <span className="text-white">NIST Essential 6</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Telemetry:</span> <span className="text-green-400">Live Engine Connected</span></div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}