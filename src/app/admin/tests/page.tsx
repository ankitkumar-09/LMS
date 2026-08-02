'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllTests, regeneratePin, deleteTest, resetTest } from '@/lib/firebase/firestore';
import { Test } from '@/lib/types';

export default function TestManagerPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumping this re-runs the data effect; used after create/delete/seed actions.
  const [reloadKey, setReloadKey] = useState(0);
  const loadTests = () => setReloadKey(k => k + 1);
  const [toast, setToast] = useState('');


  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') !== 'true') {
      router.push('/admin');
      return;
    }
    let cancelled = false;
    const run = async () => {
      const allTests = await getAllTests();
      if (!cancelled) setTests(allTests);
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [router, reloadKey]);


  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    showToast(`PIN ${pin} copied!`);
  };

  const handleRegenPin = async (testId: string) => {
    const newPin = await regeneratePin(testId);
    showToast(`New PIN: ${newPin}`);
    loadTests();
  };

  const handleReset = async (testId: string, title: string) => {
    if (!confirm(`Reopen "${title}" for a retake?\n\nThe previous attempt and its score will be deleted. The PIN stays the same.`)) return;
    try {
      await resetTest(testId);
      showToast('Test reopened — it can be taken again');
      loadTests();
    } catch (err) {
      console.error(err);
      showToast('Could not reopen the test');
    }
  };

  const handleDelete = async (testId: string, title: string) => {
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      await deleteTest(testId);
      showToast('Test deleted');
      loadTests();
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-64 bg-slate-900 -skew-y-2 origin-top-left z-0 shadow-lg"></div>

      {/* Nav */}
      <div className="relative z-10 px-8 py-5 flex items-center justify-between border-b border-white/10 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin/dashboard')} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors border border-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Manage Tests</h1>
            <p className="text-xs text-indigo-200 font-medium">View and control all assessments</p>
          </div>
        </div>
        <button onClick={() => router.push('/admin/tests/create')} className="text-sm bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
          Create Test
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl text-sm z-50 animate-slide-up flex items-center gap-3 border border-slate-700">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <span className="font-medium">{toast}</span>
        </div>
      )}

      <div className="max-w-5xl w-full mx-auto px-6 py-8 relative z-10 flex-1">
        {tests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">No Tests Found</h2>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">You haven&apos;t created any assessments yet. Get started by creating your first test.</p>
            <button onClick={() => router.push('/admin/tests/create')} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">
              Create First Test
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map(test => (
              <div key={test.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
                  
                  {/* Test Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-extrabold text-xl text-slate-800 group-hover:text-indigo-600 transition-colors">{test.title}</h3>
                      <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-widest border ${
                        test.status === 'submitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        test.status === 'in_progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {test.status === 'not_attempted' ? 'Pending' : test.status === 'in_progress' ? 'Active' : 'Submitted'}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500 mb-4">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        <span className="text-slate-700 font-bold">{test.subject}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        {test.totalQuestions} Questions
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {test.durationMinutes} min
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        Scores visible: {test.showScoreToStudent ? <span className="text-emerald-500 font-bold uppercase tracking-wider">Yes</span> : <span className="text-slate-400 font-bold uppercase tracking-wider">No</span>}
                      </div>
                    </div>
                  </div>

                  {/* PIN Display */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Access PIN</div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4 shadow-inner">
                      <span className="font-mono text-2xl font-black text-indigo-900 tracking-[0.2em] leading-none">{test.pin}</span>
                      <button onClick={() => copyPin(test.pin)} className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm" title="Copy PIN">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                  <button onClick={() => handleRegenPin(test.id)} className="text-xs font-bold px-4 py-2 border-2 border-amber-200 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 hover:border-amber-300 transition-colors flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    Regenerate PIN
                  </button>
                  
                  <button onClick={() => router.push(`/admin/tests/${test.id}/edit`)} className="text-xs font-bold px-4 py-2 border-2 border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 hover:border-indigo-300 transition-colors flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    Edit test &amp; photos
                  </button>

                  {test.status !== 'not_attempted' && (
                    <button onClick={() => handleReset(test.id, test.title)} className="text-xs font-bold px-4 py-2 border-2 border-sky-200 text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100 hover:border-sky-300 transition-colors flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                      Reopen for retake
                    </button>
                  )}

                  {test.status === 'submitted' && (
                    <button onClick={() => router.push(`/admin/tests/${test.id}`)} className="text-xs font-bold px-4 py-2 border-2 border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-colors flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                      View Results
                    </button>
                  )}

                  <div className="flex-1"></div>
                  
                  <button onClick={() => handleDelete(test.id, test.title)} className="text-xs font-bold px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Delete Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
