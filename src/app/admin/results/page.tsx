'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllTests, getAllAttempts } from '@/lib/firebase/firestore';
import { Test, Attempt } from '@/lib/types';

type Row = { test: Test; attempt: Attempt };

const fmtDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

const fmtDate = (ms: number | null) =>
  ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function ResultsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') !== 'true') {
      router.push('/admin');
      return;
    }
    let cancelled = false;
    const run = async () => {
      const [tests, attempts] = await Promise.all([getAllTests(), getAllAttempts()]);
      const submitted = tests
        .map(test => ({ test, attempt: attempts[test.id] }))
        .filter((r): r is Row => Boolean(r.attempt?.submittedAt))
        .sort((a, b) => (b.attempt.submittedAt ?? 0) - (a.attempt.submittedAt ?? 0));
      if (cancelled) return;
      setRows(submitted);
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [router]);

  // Overall totals across every submitted attempt
  const totals = rows.reduce(
    (acc, { test, attempt }) => ({
      score: acc.score + attempt.score,
      max: acc.max + test.totalQuestions * 4,
      correct: acc.correct + attempt.correctCount,
      wrong: acc.wrong + attempt.wrongCount,
      skipped: acc.skipped + attempt.unattemptedCount,
    }),
    { score: 0, max: 0, correct: 0, wrong: 0, skipped: 0 }
  );

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-12">
      <header className="bg-[#1a237e] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => router.push('/admin/dashboard')} className="text-sm text-white/70 hover:text-white transition-colors shrink-0">
            ← Dashboard
          </button>
          <span className="w-px h-5 bg-white/20" />
          <h1 className="text-base sm:text-lg font-bold truncate">Test Results</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-6 pt-6 space-y-5">
        {/* Marking scheme reminder */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3">
          <span className="font-semibold text-gray-700">Marking scheme</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Correct <strong className="text-emerald-700">+4</strong></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Wrong <strong className="text-rose-700">−1</strong></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400" /> Unattempted <strong className="text-gray-700">0</strong></span>
        </div>

        {loading ? (
          <div className="admin-card text-center py-12 text-gray-500">Loading results…</div>
        ) : rows.length === 0 ? (
          <div className="admin-card text-center py-14">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-700 font-semibold">No completed tests yet</p>
            <p className="text-sm text-gray-500 mt-1">Results appear here once a student submits a test.</p>
          </div>
        ) : (
          <>
            {/* Aggregate summary */}
            <section className="admin-card">
              <h2 className="font-bold text-[#1a237e] mb-4">
                Across {rows.length} completed test{rows.length === 1 ? '' : 's'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-[#1a237e] text-white p-4">
                  <div className="text-2xl font-black">{totals.score}<span className="text-sm font-bold opacity-70"> / {totals.max}</span></div>
                  <div className="text-[11px] uppercase tracking-widest opacity-80 mt-1">Total marks</div>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <div className="text-2xl font-black text-emerald-600">{totals.correct}</div>
                  <div className="text-[11px] uppercase tracking-widest text-emerald-700/70 mt-1">Correct (+4)</div>
                </div>
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
                  <div className="text-2xl font-black text-rose-600">{totals.wrong}</div>
                  <div className="text-[11px] uppercase tracking-widest text-rose-700/70 mt-1">Wrong (−1)</div>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <div className="text-2xl font-black text-gray-500">{totals.skipped}</div>
                  <div className="text-[11px] uppercase tracking-widest text-gray-500 mt-1">Skipped (0)</div>
                </div>
              </div>
            </section>

            {/* Per-test breakdown */}
            <section className="space-y-3">
              {rows.map(({ test, attempt }) => {
                const max = test.totalQuestions * 4;
                const pct = max > 0 ? (attempt.score / max) * 100 : 0;
                return (
                  <div key={test.id} className="admin-card">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900">{test.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                          <span className="uppercase font-bold text-[#1a237e] bg-indigo-50 px-2 py-0.5 rounded-full">{test.subject}</span>
                          <span>{test.totalQuestions} questions</span>
                          <span>Time taken {fmtDuration(attempt.timeTaken)}</span>
                          <span>Submitted {fmtDate(attempt.submittedAt)}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-3xl font-black text-[#1a237e] leading-none">
                          {attempt.score}
                          <span className="text-base font-bold text-gray-400"> / {max}</span>
                        </div>
                        <div className={`text-xs font-bold mt-1 ${pct >= 50 ? 'text-emerald-600' : pct >= 25 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {pct.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Score bar: correct / wrong / skipped by question count */}
                    <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-gray-100">
                      <div className="bg-emerald-500" style={{ width: `${(attempt.correctCount / test.totalQuestions) * 100}%` }} />
                      <div className="bg-rose-500" style={{ width: `${(attempt.wrongCount / test.totalQuestions) * 100}%` }} />
                      <div className="bg-gray-300" style={{ width: `${(attempt.unattemptedCount / test.totalQuestions) * 100}%` }} />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                        <div className="text-lg font-black text-emerald-600 leading-none">{attempt.correctCount}</div>
                        <div className="text-[11px] text-emerald-700/80 mt-1 font-semibold">
                          Correct · +{attempt.correctCount * 4}
                        </div>
                      </div>
                      <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2.5">
                        <div className="text-lg font-black text-rose-600 leading-none">{attempt.wrongCount}</div>
                        <div className="text-[11px] text-rose-700/80 mt-1 font-semibold">
                          Wrong · −{attempt.wrongCount}
                        </div>
                      </div>
                      <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
                        <div className="text-lg font-black text-gray-500 leading-none">{attempt.unattemptedCount}</div>
                        <div className="text-[11px] text-gray-500 mt-1 font-semibold">Unattempted · 0</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-400 font-mono">PIN {test.pin}</span>
                      <button
                        onClick={() => router.push(`/admin/tests/${test.id}`)}
                        className="btn btn-ghost text-xs py-2"
                      >
                        View answer sheet →
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
