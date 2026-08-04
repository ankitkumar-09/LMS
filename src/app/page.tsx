"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllTests, getAllAttempts, getTestByPin } from "@/lib/firebase/firestore";
import { Test, Attempt } from "@/lib/types";
import { formatMoment, formatElapsed } from "@/lib/utils/datetime";

/**
 * Repeating "Ankit" watermark, drawn as a tiled SVG rather than hundreds of DOM
 * nodes. The two rows are offset so the tile reads as a brick pattern instead of
 * an obvious grid.
 */
const WATERMARK_TILE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="100">
      <g fill="#0f172a" fill-opacity="0.06"
         font-family="Inter, system-ui, -apple-system, sans-serif" font-size="17" font-weight="700">
        <text x="6" y="32" transform="rotate(-24 6 32)">Ankit</text>
        <text x="81" y="82" transform="rotate(-24 81 82)">Ankit</text>
      </g>
    </svg>`
  );

/** One column per subject, so papers are grouped rather than mixed together. */
const SUBJECT_COLUMNS = [
  { key: 'physics',   label: 'Physics',     accent: 'bg-blue-50 text-blue-800',     dot: 'bg-blue-500' },
  { key: 'chemistry', label: 'Chemistry',   accent: 'bg-violet-50 text-violet-800', dot: 'bg-violet-500' },
  { key: 'maths',     label: 'Mathematics', accent: 'bg-amber-50 text-amber-800',   dot: 'bg-amber-500' },
  { key: 'other',     label: 'Combined',    accent: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
] as const;

/** Flat stamp colours. Picked per test but stable, so it never flickers on re-render. */
const STAMP_COLORS = ["#eab308", "#dc2626", "#2563eb", "#16a34a"] as const;

const stampColor = (id: string) => {
  // FNV-1a plus an avalanche mix. A plain *31 hash correlates with the last
  // character, which made almost every id land on the same colour.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return STAMP_COLORS[h % STAMP_COLORS.length];
};

export default function LandingPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [loading, setLoading] = useState(true);

  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const [allTests, allAttempts] = await Promise.all([getAllTests(), getAllAttempts()]);
        setTests(allTests);
        setAttempts(allAttempts);
      } catch (err) {
        console.error("Failed to load tests", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const handleTestSelect = (test: Test) => {
    // A submitted paper is read-only, so there's nothing left to protect with a PIN.
    // Open it straight in review mode.
    if (test.status === "submitted") {
      router.push(`/test/${test.id}/exam`);
      return;
    }

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
    <div className="min-h-screen bg-slate-50 relative flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Decoration sits in a fixed, clipped layer so it never affects page scrolling.
          Putting overflow-hidden on the page root instead would make it unscrollable. */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/50 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/40 blur-[100px]"></div>
      </div>

      {/* Watermark — decorative only, never intercepts clicks or gets read aloud */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none select-none"
        style={{
          backgroundImage: `url("${WATERMARK_TILE}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "220px 150px",
        }}
      />

      <div className="w-full max-w-7xl z-10 animate-slide-up">
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
            tests.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                <span className="text-4xl mb-3 block">📭</span>
                <p className="text-slate-500 font-medium">No tests are currently available.</p>
              </div>
            ) : (
            /* One column per subject so papers are visually segregated */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {SUBJECT_COLUMNS.map(({ key, label, accent, dot }) => {
                const columnTests = tests.filter(t =>
                  key === 'other' ? !['physics', 'chemistry', 'maths'].includes(t.subject) : t.subject === key
                );
                if (key === 'other' && columnTests.length === 0) return null;

                return (
                  <div key={key} className="flex flex-col gap-4">
                    {/* Column heading */}
                    <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${accent}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dot}`}></span>
                        <h3 className="font-extrabold text-sm uppercase tracking-widest">{label}</h3>
                      </div>
                      <span className="text-xs font-bold opacity-70">{columnTests.length}</span>
                    </div>

                    {columnTests.length === 0 ? (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center">
                        <p className="text-xs text-slate-400 font-medium">No {label.toLowerCase()} papers yet</p>
                      </div>
                    ) : (
                      columnTests.map((test) => {
                  const isSubmitted = test.status === 'submitted';
                  const isSelected = selectedTest?.id === test.id;
                  const attempt = attempts[test.id];
                  const maxScore = test.totalQuestions * 4;
                  // Only reveal marks if the admin enabled it for this test
                  const showMarks = isSubmitted && attempt?.submittedAt != null && test.showScoreToStudent;

                  return (
                    <div
                      key={test.id}
                      onClick={() => handleTestSelect(test)}
                      className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                        isSubmitted
                          ? 'bg-emerald-50/40 border border-emerald-200 cursor-pointer hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-50'
                          : isSelected
                            ? 'bg-white border-2 border-indigo-500 shadow-xl shadow-indigo-100 transform -translate-y-1'
                            : 'bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-slate-100 cursor-pointer hover:-translate-y-1'
                      }`}
                    >
                      {/* Status Indicator Bar */}
                      <div className={`absolute top-0 left-0 w-1 h-full ${
                        isSubmitted ? 'bg-emerald-500' : test.status === 'in_progress' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}></div>

                      {/* Completed stamp — one flat colour, no gradient */}
                      {isSubmitted && (
                        <div
                          className="absolute top-5 right-[-38px] rotate-45 text-white text-[10px] font-black tracking-[0.2em] py-1.5 w-[150px] text-center shadow-sm pointer-events-none"
                          style={{ backgroundColor: stampColor(test.id) }}
                        >
                          COMPLETED
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4 pl-2 gap-3">
                        <h3 className={`font-bold text-xl ${isSubmitted ? 'text-slate-700' : 'text-slate-800'}`}>{test.title}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest ${
                          test.subject === 'physics' ? 'bg-blue-50 text-blue-700' :
                          test.subject === 'chemistry' ? 'bg-violet-50 text-violet-700' :
                          test.subject === 'maths' ? 'bg-amber-50 text-amber-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {test.subject}
                        </span>
                      </div>

                      {/* Marks scored */}
                      {showMarks && (
                        <div className="ml-2 mb-4 rounded-xl bg-white border border-emerald-200 px-4 py-3">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                              Marks scored
                              {(attempt.attemptNumber ?? 1) > 1 && (
                                <span className="ml-1.5 text-amber-700">
                                  · retest #{attempt.attemptNumber}
                                </span>
                              )}
                            </span>
                            <span className="text-2xl font-black text-emerald-600 leading-none">
                              {attempt.score}
                              <span className="text-base font-bold text-slate-400"> / {maxScore}</span>
                            </span>
                          </div>
                          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold">
                            <span className="text-emerald-700">{attempt.correctCount} correct · +4</span>
                            <span className="text-rose-600">{attempt.wrongCount} wrong · −1</span>
                            <span className="text-slate-400">{attempt.unattemptedCount} skipped · 0</span>
                          </div>

                          {(() => {
                            const taken = formatMoment(attempt.submittedAt);
                            if (!taken) return null;
                            return (
                              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="font-semibold text-slate-600">{taken.day}, {taken.date}</span>
                                <span className="text-slate-400">at {taken.time}</span>
                                <span className="text-slate-400">· took {formatElapsed(attempt.timeTaken)}</span>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {isSubmitted && !test.showScoreToStudent && (
                        <div className="ml-2 mb-4 rounded-xl bg-white border border-slate-200 px-4 py-3 text-xs text-slate-500 font-medium">
                          Your response is recorded. Marks will be published by your administrator.
                        </div>
                      )}

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
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              REVIEW ANSWERS
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
                );
              })}
            </div>
            )
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
