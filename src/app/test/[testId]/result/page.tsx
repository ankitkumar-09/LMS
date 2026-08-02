"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTest, getAttempt } from "@/lib/firebase/firestore";
import { Test, Attempt } from "@/lib/types";

export default function ResultPage() {
  const params = useParams();
  const testId = params.testId as string;
  
  const [test, setTest] = useState<Test | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const t = await getTest(testId);
        const a = await getAttempt(testId);
        setTest(t);
        setAttempt(a);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [testId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-medium text-slate-500">
        Loading your result…
      </div>
    );
  }

  if (!test || !attempt) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="font-medium text-slate-600 max-w-sm">
          We couldn&apos;t find a submitted attempt for this test.
        </p>
        <Link href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
          Back to Test Portal
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Decorative Background Elements */}
      <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-200/30 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-200/30 blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-10 text-center relative z-10 border border-slate-100 animate-slide-up">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto bg-emerald-50 rounded-full flex items-center justify-center mb-8 relative">
          <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20"></div>
          <svg className="w-12 h-12 text-emerald-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        
        <h1 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">Test Submitted!</h1>
        <p className="text-slate-500 font-medium mb-10 leading-relaxed">Your assessment has been successfully recorded and saved to our secure database.</p>

        {test.showScoreToStudent ? (
          <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 shadow-inner mb-8">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Total Score</div>
            <div className="text-5xl font-black text-slate-800 mb-8 flex items-baseline justify-center gap-2">
              <span className="text-indigo-600">{attempt.score}</span> 
              <span className="text-2xl text-slate-400 font-bold">/ {test.totalQuestions * 4}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-emerald-500 font-black text-xl">{attempt.correctCount}</div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Correct</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-rose-500 font-black text-xl">{attempt.wrongCount}</div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Incorrect</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-slate-400 font-black text-xl">{attempt.unattemptedCount}</div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Skipped</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-6 rounded-2xl text-sm font-medium leading-relaxed mb-8 shadow-sm">
            Your results are safely recorded. <br/> Scores will be published by your administrator at a later time.
          </div>
        )}
        
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          You may safely close this window
        </div>
      </div>
    </div>
  );
}
