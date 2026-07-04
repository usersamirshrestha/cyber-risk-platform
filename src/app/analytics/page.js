'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allCompanies, setAllCompanies] = useState([]); // Store list of unique companies
  const [selectedCompanyId, setSelectedCompanyId] = useState('all'); // Track selected filter
  const [filteredChartData, setFilteredChartData] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnalyticsData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }
        setUser(session.user);

        // Fetch relational audit response scores linked to this operator
        const { data: companiesData, error: compErr } = await supabase
          .from('companies')
          .select(`
            id,
            name,
            industry,
            created_at,
            audit_responses (
              answer,
              risk_framework (
                risk_weight
              )
            )
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });

        if (compErr) throw compErr;

        // Process the relational rows into independent data profiles
        const processedCompanies = companiesData.map((company) => {
          let totalWeight = 0;
          let earnedWeight = 0;

          company.audit_responses.forEach((resp) => {
            const weight = resp.risk_framework?.risk_weight || 0;
            totalWeight += weight;
            if (resp.answer === 'Yes') earnedWeight += weight;
            else if (resp.answer === 'Partial') earnedWeight += (weight * 0.5);
          });

          const finalScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

          return {
            id: company.id,
            rawDate: company.created_at,
            date: new Date(company.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            companyName: company.name,
            industry: company.industry,
            score: finalScore
          };
        });

        setAllCompanies(processedCompanies);
        
        // Default view: show all scores initially
        setFilteredChartData(processedCompanies);

      } catch (err) {
        setError(err.message || 'Error executing analytics data pipeline.');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalyticsData();
  }, []);

  // Whenever the dropdown selection changes, instantly re-filter the data vectors
  useEffect(() => {
    if (selectedCompanyId === 'all') {
      setFilteredChartData(allCompanies);
    } else {
      const filtered = allCompanies.filter(c => c.companyName === selectedCompanyId);
      setFilteredChartData(filtered);
    }
  }, [selectedCompanyId, allCompanies]);

  // Extract unique company names for our dropdown list selection
  const uniqueCompanyNames = Array.from(new Set(allCompanies.map(c => c.companyName)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center font-mono text-sm tracking-widest text-gray-500 animate-pulse">
          INGESTING ANALYTICS CORE...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 md:p-12 space-y-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Security Analytics Workspace</h1>
          <p className="text-xs font-mono text-gray-500 mt-1">Operator Profile: {user?.email}</p>
        </div>
        
        {/* Dynamic Target Selection Dropdown Control */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono whitespace-nowrap">Filter Scope:</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-w-[200px]"
          >
            <option value="all">All Organizations Combined</option>
            {uniqueCompanyNames.map((name, index) => (
              <option key={index} value={name}>{name}</option>
            ))}
          </select>
          
          <a href="/" className="text-xs px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-md text-blue-400 font-semibold transition whitespace-nowrap ml-2">
            ← Return
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Graph Display Area */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-xl">
          <div>
            <h2 className="text-lg font-bold">
              {selectedCompanyId === 'all' ? 'Global Posture Trend' : `${selectedCompanyId} Posture Trend`}
            </h2>
            <p className="text-xs text-gray-500 font-mono">Isolated Cyber Risk Timeline Progression</p>
          </div>

          {filteredChartData.length < 2 ? (
            <div className="h-[300px] flex items-center justify-center border border-dashed border-gray-800 rounded-xl text-gray-500 text-sm font-mono text-center px-4">
              Insufficient data vectors for this selection. Complete multiple historical audits for {selectedCompanyId === 'all' ? 'organizations' : selectedCompanyId} to generate timeline trends.
            </div>
          ) : (
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8', fontFamily: 'monospace' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} name="Security Score" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Audit Log Historical Feed Table */}
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-xl">
          <div>
            <h2 className="text-lg font-bold">Audit Submission Log</h2>
            <p className="text-xs text-gray-500 font-mono">Immutable Profile Records</p>
          </div>

          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {allCompanies.length === 0 ? (
              <div className="text-xs text-center text-gray-500 p-4 font-mono">No record metrics discovered.</div>
            ) : (
              allCompanies
                .filter(c => selectedCompanyId === 'all' || c.companyName === selectedCompanyId)
                .slice().reverse()
                .map((audit, idx) => (
                  <div key={idx} className="bg-gray-950 border border-gray-800 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">{audit.companyName}</p>
                      <p className="text-[10px] font-mono text-gray-500 mt-0.5">{audit.date} • <span className="text-blue-500">{audit.industry}</span></p>
                    </div>
                    <span className={`text-sm font-black px-2.5 py-1 rounded font-mono border ${
                      audit.score >= 80 ? 'bg-green-950/40 text-green-400 border-green-900/40' :
                      audit.score >= 50 ? 'bg-yellow-950/40 text-yellow-400 border-yellow-900/40' : 'bg-red-950/40 text-red-400 border-red-900/40'
                    }`}>
                      {audit.score}%
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}