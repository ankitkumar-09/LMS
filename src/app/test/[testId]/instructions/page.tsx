"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { startAttempt } from "@/lib/firebase/firestore";

export default function InstructionsPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId as string;

  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleProceed = async () => {
    if (!isChecked) return;

    // Read the PIN at click time so we never touch sessionStorage during render
    const pin = sessionStorage.getItem("testPin");
    if (!pin) {
      setError("Your session expired. Please enter your PIN again.");
      setTimeout(() => router.push("/"), 1500);
      return;
    }

    setIsLoading(true);
    try {
      await startAttempt(testId, pin);
      router.push(`/test/${testId}/exam`);
    } catch (err) {
      console.error(err);
      setError("Could not start the test. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/40 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/40 blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl w-full bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden relative z-10 border border-slate-100 animate-slide-up flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white py-6 px-8 relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight relative z-10 flex items-center gap-3">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Instructions for the Assessment
          </h1>
        </div>
        
        {/* Content Scrollable Area */}
        <div className="p-6 sm:p-10 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* General Instructions */}
          <section className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm">1</span>
              General Rules
            </h2>
            <ol className="list-decimal pl-5 space-y-3 text-slate-600 font-medium">
              <li>Total duration of examination is <strong className="text-slate-800">60 minutes</strong>.</li>
              <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
              <li>The Question Palette displayed on the right side of screen will show the status of each question using specific symbols.</li>
            </ol>
            
            {/* Status Legend Grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-500 font-bold text-sm bg-slate-200 border border-slate-300 rounded-full">1</div>
                <span className="text-sm text-slate-600 font-medium pt-1">You have <strong className="text-slate-800">not visited</strong> the question yet.</span>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center text-white font-bold text-sm bg-red-500 shadow-sm shadow-red-200 rounded-full">2</div>
                <span className="text-sm text-slate-600 font-medium pt-1">You have <strong className="text-slate-800">not answered</strong> the question.</span>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center text-white font-bold text-sm bg-emerald-500 shadow-sm shadow-emerald-200 rounded-full">3</div>
                <span className="text-sm text-slate-600 font-medium pt-1">You have <strong className="text-slate-800">answered</strong> the question.</span>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center text-white font-bold text-sm bg-violet-500 shadow-sm shadow-violet-200 rounded-full">4</div>
                <span className="text-sm text-slate-600 font-medium pt-1">You have NOT answered, but <strong className="text-slate-800">marked</strong> for review.</span>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 sm:col-span-2">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center text-white font-bold text-sm bg-violet-500 shadow-sm shadow-violet-200 rounded-full relative">
                  5
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <span className="text-sm text-slate-600 font-medium pt-1">The question(s) &ldquo;Answered and Marked for Review&rdquo; will be considered for evaluation.</span>
              </div>
            </div>
          </section>

          {/* Marking Scheme */}
          <section className="bg-indigo-50/50 rounded-2xl p-6 sm:p-8 border border-indigo-100">
            <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm">2</span>
              Marking Scheme
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-1 transition-transform">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-black">+4</div>
                <div className="text-sm font-bold text-slate-700">Correct Answer</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-1 transition-transform">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl font-black">-1</div>
                <div className="text-sm font-bold text-slate-700">Incorrect Answer</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-1 transition-transform">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xl font-black">0</div>
                <div className="text-sm font-bold text-slate-700">Unanswered</div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Action */}
        <div className="bg-white p-6 sm:p-8 border-t border-slate-200 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20">
          <label className="flex items-start gap-4 cursor-pointer group mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
            <div className="relative flex items-center justify-center shrink-0 mt-0.5">
              <input 
                type="checkbox" 
                className="peer appearance-none w-6 h-6 border-2 border-slate-300 rounded-md checked:border-indigo-600 checked:bg-indigo-600 transition-colors cursor-pointer"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
              />
              <svg className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors leading-relaxed">
              I have read and understood all the instructions. I confirm that I am ready to begin the assessment in a fair and honest manner.
            </span>
          </label>
          
          {error && (
            <p className="mb-4 text-sm text-red-600 font-semibold text-center">{error}</p>
          )}

          <button
            onClick={handleProceed}
            disabled={!isChecked || isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-extrabold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Initializing Assessment...
              </>
            ) : "Begin Assessment"}
          </button>
        </div>
      </div>
    </div>
  );
}
