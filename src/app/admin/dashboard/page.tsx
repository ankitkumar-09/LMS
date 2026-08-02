'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllTests, seedMockTests } from '@/lib/firebase/firestore';
import { Test } from '@/lib/types';

export default function AdminDashboard() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumping this re-runs the data effect; used after create/delete/seed actions.
  const [reloadKey, setReloadKey] = useState(0);
  const loadTests = () => setReloadKey(k => k + 1);
  const [isSeeding, setIsSeeding] = useState(false);


  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') !== 'true') {
      router.push('/admin');
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const allTests = await getAllTests();
        if (!cancelled) setTests(allTests);
      } catch (err) {
        console.error(err);
      }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [router, reloadKey]);


  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const { seeded, questions } = await seedMockTests();
      loadTests();
      alert(`Seeded ${seeded} mathematics papers (${questions} questions).`);
    } catch (e) {
      console.error(e);
      alert("Seeding failed. Check your Firebase config and network connection.");
    }
    setIsSeeding(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    router.push('/admin');
  };

  const totalTests = tests.length;
  const activeTests = tests.filter(t => t.status === 'in_progress').length;
  const completedTests = tests.filter(t => t.status === 'submitted').length;
  const pendingTests = tests.filter(t => t.status === 'not_attempted').length;

  if (loading) {
    return <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative overflow-hidden text-gray-900">
      {/* Modern Nav Bar */}
      <div className="relative z-10 px-8 py-4 flex items-center justify-between border-b border-gray-200 bg-header-gradient shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Admin Portal</h1>
            <p className="text-xs text-blue-200 font-medium">Control Center</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={handleSeed} disabled={isSeeding} className="text-sm bg-yellow-400 text-gray-900 px-5 py-2 rounded-lg font-bold hover:bg-yellow-300 transition-all">
            {isSeeding ? "Seeding..." : "Seed Tests"}
          </button>
          <button onClick={handleLogout} className="text-sm bg-white text-[#1e3c72] px-5 py-2 rounded-lg font-bold hover:bg-gray-100 transition-all flex items-center gap-2 group">
            <span>Logout</span>
            <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>
      </div>

      <div className="max-w-6xl w-full mx-auto px-6 py-8 relative z-10 flex-1 flex flex-col">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-10">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col items-center justify-center transform transition-transform hover:-translate-y-1">
            <div className="text-4xl font-black text-[#1e3c72] mb-1">{totalTests}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Tests</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col items-center justify-center transform transition-transform hover:-translate-y-1">
            <div className="text-4xl font-black text-[#ffc107] mb-1">{pendingTests}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col items-center justify-center transform transition-transform hover:-translate-y-1">
            <div className="text-4xl font-black text-[#007bff] mb-1">{activeTests}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">In Progress</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col items-center justify-center transform transition-transform hover:-translate-y-1">
            <div className="text-4xl font-black text-[#28a745] mb-1">{completedTests}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Completed</div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <button onClick={() => router.push('/admin/tests/create')} className="group text-left bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md hover:border-[#1e3c72] transition-all relative overflow-hidden cursor-pointer">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 relative z-10 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 relative z-10">Create New Test</h3>
            <p className="text-sm text-gray-600 relative z-10">Add questions, set duration, and generate PIN for a new assessment.</p>
          </button>
          
          <button onClick={() => router.push('/admin/tests')} className="group text-left bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md hover:border-[#28a745] transition-all relative overflow-hidden cursor-pointer">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-6 relative z-10 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 relative z-10">Manage Tests</h3>
            <p className="text-sm text-gray-600 relative z-10">View active tests, edit details, and analyze student results.</p>
          </button>
          
          <button onClick={() => router.push('/admin/question-bank')} className="group text-left bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md hover:border-[#6f42c1] transition-all relative overflow-hidden cursor-pointer">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-6 relative z-10 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 relative z-10">Question Bank</h3>
            <p className="text-sm text-gray-600 relative z-10">Manage your central library of questions for reusable tests.</p>
          </button>
        </div>

        {/* Recent Tests Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#1e3c72]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Recent Assessments
            </h2>
          </div>
          
          <div className="p-0 flex-1">
            {tests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h4 className="text-lg font-bold text-gray-700 mb-1">No Tests Found</h4>
                <p className="text-sm text-gray-500">You haven&apos;t created any assessments yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tests.slice(0, 5).map(test => (
                  <div key={test.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-gray-50 transition-colors group">
                    <div className="mb-3 sm:mb-0">
                      <div className="font-bold text-gray-900 text-lg">{test.title}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">{test.subject}</span>
                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          {test.durationMinutes} mins
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3">
                      <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">PIN</span>
                        <span className="font-mono text-sm font-bold text-gray-900 tracking-widest">{test.pin}</span>
                      </div>
                      
                      <span className={`text-xs px-3 py-1 rounded font-bold uppercase tracking-wider border ${
                        test.status === 'submitted' ? 'bg-[#28a745]/10 text-[#28a745] border-[#28a745]/30' :
                        test.status === 'in_progress' ? 'bg-[#007bff]/10 text-[#007bff] border-[#007bff]/30' :
                        'bg-gray-100 text-gray-600 border-gray-300'
                      }`}>
                        {test.status === 'not_attempted' ? 'Pending' : test.status === 'in_progress' ? 'Active' : 'Completed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
