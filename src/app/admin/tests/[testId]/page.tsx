'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTest, getTestQuestions, getAttempt, updateQuestionImage } from '@/lib/firebase/firestore';
import { Test, Question, Attempt } from '@/lib/types';
import ImageUpload from '@/components/ImageUpload';

export default function TestResultsPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  // Image edits update local state directly, so the data effect only needs to run once.
  const [reloadKey] = useState(0);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [savingImageFor, setSavingImageFor] = useState<string | null>(null);
  const [imageNotice, setImageNotice] = useState('');

  const handleImageChange = async (question: Question, url: string) => {
    setSavingImageFor(question.id);
    setImageNotice('');
    try {
      await updateQuestionImage(testId, question.id, url || null);
      setQuestions(prev =>
        prev.map(q => (q.id === question.id ? { ...q, imageURL: url || null } : q))
      );
      setImageNotice(
        url
          ? `Image saved for question ${question.questionNumber}.`
          : `Image removed from question ${question.questionNumber}.`
      );
      setTimeout(() => setImageNotice(''), 3000);
    } catch (err) {
      console.error(err);
      setImageNotice(`Could not save the image for question ${question.questionNumber}.`);
    } finally {
      setSavingImageFor(null);
    }
  };


  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') !== 'true') {
      router.push('/admin');
      return;
    }
    let cancelled = false;
    const run = async () => {
      const [t, qs, a] = await Promise.all([
        getTest(testId),
        getTestQuestions(testId),
        getAttempt(testId),
      ]);
      if (!cancelled) setTest(t);
      if (!cancelled) setQuestions(qs);
      if (!cancelled) setAttempt(a);
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [router, testId, reloadKey]);


  if (loading) {
    return <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center"><p className="text-gray-500">Loading results...</p></div>;
  }

  if (!test) {
    return <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center"><p className="text-gray-500">Test not found</p></div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Nav */}
      <header className="bg-[#1a237e] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => router.push('/admin/tests')} className="text-sm text-white/70 hover:text-white transition-colors shrink-0">← Tests</button>
          <span className="w-px h-5 bg-white/20" />
          <h1 className="text-base sm:text-lg font-bold truncate">{test.title} — Results</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Test Info */}
        <div className="admin-card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Subject:</span> <strong>{test.subject}</strong></div>
            <div><span className="text-gray-500">Questions:</span> <strong>{test.totalQuestions}</strong></div>
            <div><span className="text-gray-500">PIN:</span> <span className="font-mono font-bold">{test.pin}</span></div>
            <div><span className="text-gray-500">Status:</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                test.status === 'submitted' ? 'bg-green-100 text-green-700' :
                test.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {test.status}
              </span>
            </div>
          </div>
        </div>

        {/* Question images — attach diagrams after the test was created */}
        <section className="admin-card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-bold text-[#1a237e]">Question images</h2>
              <p className="text-xs text-gray-500 mt-1">
                {questions.filter(q => q.imageURL).length} of {questions.length} questions have an image.
                Uploaded a JSON without image URLs? Add them here.
              </p>
            </div>
            <button onClick={() => setShowImageEditor(v => !v)} className="btn btn-ghost">
              {showImageEditor ? 'Hide' : 'Manage images'}
            </button>
          </div>

          {imageNotice && (
            <p className="mt-3 text-xs font-semibold text-[#1565c0]">{imageNotice}</p>
          )}

          {showImageEditor && (
            <div className="mt-5 space-y-4 max-h-[32rem] overflow-y-auto custom-scrollbar pr-1">
              {questions.map(q => (
                <div key={q.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-[#1a237e]/10 text-[#1a237e] text-xs font-bold flex items-center justify-center shrink-0">
                      {q.questionNumber}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {q.questionText
                        ? q.questionText.slice(0, 140) + (q.questionText.length > 140 ? '…' : '')
                        : <span className="italic text-gray-400">No question text — image only</span>}
                    </p>
                    {savingImageFor === q.id && (
                      <span className="text-[11px] text-gray-400 shrink-0 ml-auto">Saving…</span>
                    )}
                  </div>
                  <ImageUpload
                    value={q.imageURL ?? ''}
                    onChange={url => handleImageChange(q, url)}
                    label=""
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {!attempt || test.status !== 'submitted' ? (
          <div className="admin-card text-center py-12">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-gray-500">Test has not been submitted yet.</p>
            <p className="text-sm text-gray-400 mt-1">Results will appear here once the student submits.</p>
          </div>
        ) : (
          <>
            {/* Score Card */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="admin-card text-center md:col-span-1 bg-gradient-to-br from-[#1a237e] to-[#1565c0] text-white">
                <div className="text-4xl font-bold">{attempt.score}</div>
                <div className="text-xs opacity-80">Score / {test.totalQuestions * 4}</div>
                <div className="text-sm font-semibold mt-1">{((attempt.score / (test.totalQuestions * 4)) * 100).toFixed(1)}%</div>
              </div>
              <div className="admin-card text-center">
                <div className="text-3xl font-bold text-green-600">{attempt.correctCount}</div>
                <div className="text-xs text-gray-500">Correct (+4 each)</div>
              </div>
              <div className="admin-card text-center">
                <div className="text-3xl font-bold text-red-600">{attempt.wrongCount}</div>
                <div className="text-xs text-gray-500">Wrong (−1 each)</div>
              </div>
              <div className="admin-card text-center">
                <div className="text-3xl font-bold text-gray-500">{attempt.unattemptedCount}</div>
                <div className="text-xs text-gray-500">Unattempted (0)</div>
              </div>
              <div className="admin-card text-center">
                <div className="text-3xl font-bold text-blue-600">{Math.floor(attempt.timeTaken / 60)}m</div>
                <div className="text-xs text-gray-500">Time Taken</div>
              </div>
            </div>

            {/* Response Sheet */}
            <div className="admin-card">
              <h2 className="font-bold text-[#1a237e] mb-4">📝 Response Sheet</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Q#</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Question</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium">Student&apos;s Answer</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium">Correct</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q) => {
                      const response = attempt.responses[q.questionNumber.toString()];
                      const studentAns = response?.selected || '—';
                      const isCorrect = studentAns === q.correctOption;
                      const isUnattempted = !response?.selected;

                      return (
                        <tr key={q.id} className={`border-b border-gray-100 ${
                          isUnattempted ? 'bg-gray-50' : isCorrect ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          <td className="py-2 px-2 font-mono font-bold text-gray-600">{q.questionNumber}</td>
                          <td className="py-2 px-2 text-gray-700 max-w-xs truncate">{q.questionText.slice(0, 80)}{q.questionText.length > 80 ? '...' : ''}</td>
                          <td className="py-2 px-2 text-center font-bold">
                            {isUnattempted ? (
                              <span className="text-gray-400">—</span>
                            ) : (
                              <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>{studentAns}</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-green-700">{q.correctOption}</td>
                          <td className="py-2 px-2 text-center">
                            {isUnattempted ? (
                              <span className="text-gray-400 text-lg">⬜</span>
                            ) : isCorrect ? (
                              <span className="text-green-600 text-lg">✅</span>
                            ) : (
                              <span className="text-red-600 text-lg">❌</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
