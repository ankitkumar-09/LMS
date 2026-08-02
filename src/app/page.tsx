"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllTests, getTestByPin } from "@/lib/firebase/firestore";
import { Test } from "@/lib/types";

export default function LandingPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const allTests = await getAllTests();
        setTests(allTests);
      } catch (err) {
        console.error("Failed to load tests", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const handleTestSelect = (test: Test) => {
    setSelectedTest(test);
    setPin("");
    setError("");
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;
    
    setError("");
    if (pin.length < 3) {
      setError("Invalid PIN");
      return;
    }

    setIsVerifying(true);
    try {
      if (selectedTest.pin !== pin.toUpperCase()) {
        setError("Invalid PIN for this test");
        setIsVerifying(false);
        return;
      }

      const test = await getTestByPin(pin);
      
      if (!test) {
        setError("Test not found");
      } else {
        sessionStorage.setItem("testPin", pin.toUpperCase());
        if (test.status === "in_progress" || test.status === "submitted") {
          router.push(`/test/${test.id}/exam`);
        } else {
          router.push(`/test/${test.id}/instructions`);
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/50 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/40 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-5xl z-10 animate-slide-up">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-xl shadow-indigo-100 mb-6 text-indigo-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Master the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">JEE Mains</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
            Experience the most realistic and advanced mock test platform. Choose a test below to begin your assessment.
          </p>
        </div>

        {/* Tests Container */}
        <div className="glass-card rounded-3xl p-6 sm:p-8">
          {loading ? (
            <div className="text-center py-16 flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium">Loading available tests...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tests.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                  <span className="text-4xl mb-3 block">📭</span>
                  <p className="text-slate-500 font-medium">No tests are currently available.</p>
                </div>
              ) : (
                tests.map((test) => {
                  const isSubmitted = test.status === 'submitted';
                  const isSelected = selectedTest?.id === test.id;
                  
                  return (
                    <div 
                      key={test.id}
                      onClick={() => handleTestSelect(test)}
                      className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                        isSubmitted 
                          ? 'bg-slate-50 border border-slate-200 opacity-70 cursor-not-allowed grayscale-[0.5]'
                          : isSelected
                            ? 'bg-white border-2 border-indigo-500 shadow-xl shadow-indigo-100 transform -translate-y-1'
                            : 'bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-slate-100 cursor-pointer hover:-translate-y-1'
                      }`}
                    >
                      {/* Status Indicator Bar */}
                      <div className={`absolute top-0 left-0 w-1 h-full ${
                        isSubmitted ? 'bg-slate-400' : test.status === 'in_progress' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}></div>

                      <div className="flex justify-between items-start mb-4 pl-2">
                        <h3 className={`font-bold text-xl ${isSubmitted ? 'text-slate-500' : 'text-slate-800'}`}>{test.title}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest ${
                          test.subject === 'physics' ? 'bg-blue-50 text-blue-700' :
                          test.subject === 'chemistry' ? 'bg-violet-50 text-violet-700' :
                          test.subject === 'maths' ? 'bg-amber-50 text-amber-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {test.subject}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-6 pl-2">
                        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            {test.totalQuestions} Qs
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            {test.durationMinutes} Mins
                          </span>
                        </div>
                        <div>
                          {isSubmitted ? (
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> COMPLETED
                            </span>
                          ) : test.status === 'in_progress' ? (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> IN PROGRESS
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> AVAILABLE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modern PIN Entry Modal */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setSelectedTest(null)}></div>
          
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm relative z-10 animate-slide-up border border-slate-100">
            <button 
              onClick={() => setSelectedTest(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <div className="text-center mb-8 mt-4">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">{selectedTest.title}</h2>
              <p className="text-sm font-medium text-slate-500 mt-2">Enter the secure PIN</p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  className="block w-full px-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-indigo-500 uppercase text-center text-3xl tracking-[0.3em] font-mono text-slate-800 shadow-inner bg-slate-50 transition-colors"
                  placeholder="•••"
                  autoFocus
                  required
                />
                {error && <p className="mt-3 text-sm text-red-500 text-center font-semibold animate-pulse">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isVerifying || pin.length < 3}
                className="w-full flex justify-center py-4 px-4 rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:-translate-y-0.5"
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : "Unlock Assessment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
