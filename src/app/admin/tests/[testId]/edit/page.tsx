'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTest, getTestQuestions, updateTest, saveQuestions } from '@/lib/firebase/firestore';
import { Test, Question, Subject, Difficulty } from '@/lib/types';
import ImageUpload from '@/components/ImageUpload';
import { uploadImage, UploadError } from '@/lib/utils/cloudinary';

const navigatorIsMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

export default function EditTestPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [dirty, setDirty] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Bulk paste: arm a question, then Ctrl/Cmd+V anywhere drops the screenshot in
  // and the target advances to the next question automatically.
  const [pasteIndex, setPasteIndex] = useState<number | null>(null);
  const [pasteBusy, setPasteBusy] = useState(false);
  const [pasteNote, setPasteNote] = useState('');
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Test-level fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<Subject>('maths');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [showScore, setShowScore] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') !== 'true') {
      router.push('/admin');
      return;
    }
    let cancelled = false;
    const run = async () => {
      const [t, qs] = await Promise.all([getTest(testId), getTestQuestions(testId)]);
      if (cancelled) return;
      setTest(t);
      setQuestions(qs);
      if (t) {
        setTitle(t.title);
        setSubject(t.subject);
        setDurationMinutes(t.durationMinutes);
        setShowScore(t.showScoreToStudent);
      }
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [router, testId]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Document-level paste listener, active only while a question is armed.
  useEffect(() => {
    if (pasteIndex === null) return;

    const onPaste = async (e: ClipboardEvent) => {
      // Don't hijack normal text pasting into inputs
      const el = e.target as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA'].includes(el.tagName)) return;

      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'));
      if (!item) {
        setPasteNote('No image in clipboard — take a screenshot first.');
        return;
      }
      e.preventDefault();

      const file = item.getAsFile();
      if (!file) return;

      const target = pasteIndex;
      setPasteBusy(true);
      setPasteNote(`Uploading image for question ${target + 1}…`);
      try {
        const url = await uploadImage(file, `question-${target + 1}.png`);
        setQuestions(prev => prev.map((q, i) => (i === target ? { ...q, imageURL: url } : q)));
        setDirty(true);

        setQuestions(current => {
          if (autoAdvance) {
            const next = target + 1;
            setPasteIndex(next < current.length ? next : null);
            setPasteNote(
              next < current.length
                ? `Saved to question ${target + 1}. Now pasting into question ${next + 1}.`
                : `Saved to question ${target + 1}. That was the last question.`
            );
          } else {
            setPasteNote(`Saved to question ${target + 1}.`);
          }
          return current;
        });
      } catch (err) {
        setPasteNote(err instanceof UploadError ? err.message : 'Upload failed. Try again.');
      } finally {
        setPasteBusy(false);
      }
    };

    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [pasteIndex, autoAdvance]);

  // Esc leaves paste mode
  useEffect(() => {
    if (pasteIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPasteIndex(null); setPasteNote(''); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pasteIndex]);

  const patchQuestion = (index: number, patch: Partial<Question>) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
    setDirty(true);
  };

  const patchOption = (index: number, letter: 'A' | 'B' | 'C' | 'D', value: string) => {
    setQuestions(prev =>
      prev.map((q, i) => (i === index ? { ...q, options: { ...q.options, [letter]: value } } : q))
    );
    setDirty(true);
  };

  const addQuestion = () => {
    const nextNumber = questions.length + 1;
    setQuestions(prev => [
      ...prev,
      {
        id: `q_${nextNumber}_${Math.random().toString(36).slice(2, 7)}`,
        questionNumber: nextNumber,
        questionText: '',
        imageURL: null,
        options: { A: '', B: '', C: '', D: '' },
        correctOption: 'A',
        subject,
        difficulty: 'medium',
      },
    ]);
    setOpenIndex(questions.length);
    setDirty(true);
  };

  const removeQuestion = (index: number) => {
    if (!confirm(`Remove question ${index + 1}?`)) return;
    setQuestions(prev => prev.filter((_, i) => i !== index));
    setOpenIndex(null);
    setDirty(true);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setOpenIndex(target);
    setDirty(true);
  };

  const problems = questions.flatMap((q, i) => {
    const issues: string[] = [];
    if (!q.questionText.trim() && !q.imageURL) issues.push(`Question ${i + 1}: needs text or an image`);

    if ((q.questionType ?? 'mcq') === 'numerical') {
      // Numerical questions carry no options — only a value
      if (q.numericalAnswer === null || q.numericalAnswer === undefined || !Number.isFinite(q.numericalAnswer)) {
        issues.push(`Question ${i + 1}: numerical question needs an answer value`);
      }
    } else if (!['A', 'B', 'C', 'D'].every(l => q.options[l as 'A'].trim())) {
      issues.push(`Question ${i + 1}: all four options are required`);
    }
    return issues;
  });

  const handleSave = async () => {
    if (!title.trim()) { showToastMsg('Test title is required'); return; }
    if (problems.length > 0) { showToastMsg('Fix the highlighted problems first'); return; }

    setSaving(true);
    try {
      await updateTest(testId, {
        title: title.trim(),
        subject,
        durationMinutes,
        showScoreToStudent: showScore,
      });
      await saveQuestions(testId, questions);
      setDirty(false);
      showToastMsg('Changes saved');
    } catch (err) {
      console.error(err);
      showToastMsg('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center text-gray-500">Loading test…</div>;
  }
  if (!test) {
    return <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center text-gray-500">Test not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-24">
      <header className="bg-[#1a237e] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => router.push('/admin/tests')} className="text-sm text-white/70 hover:text-white transition-colors shrink-0">
            ← Tests
          </button>
          <span className="w-px h-5 bg-white/20" />
          <h1 className="text-base sm:text-lg font-bold truncate">Edit test</h1>
          {dirty && <span className="ml-auto text-xs bg-amber-400 text-amber-900 px-2.5 py-1 rounded-full font-bold">Unsaved</span>}
        </div>
      </header>

      {toast && (
        <div className="fixed top-20 right-5 bg-[#1a237e] text-white px-4 py-2.5 rounded-lg shadow-xl text-sm z-50 animate-slide-up">
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-6 space-y-5">
        {test.status === 'submitted' && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
            This test has already been submitted. Editing it won&apos;t change the recorded result —
            use <strong>Reopen</strong> on the tests list if you want it attempted again.
          </div>
        )}

        {/* Test details */}
        <section className="admin-card">
          <h2 className="font-bold text-[#1a237e] mb-5">Test details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="admin-label">Test title</label>
              <input value={title} onChange={e => { setTitle(e.target.value); setDirty(true); }} className="admin-input" />
            </div>
            <div>
              <label className="admin-label">Subject</label>
              <select value={subject} onChange={e => { setSubject(e.target.value as Subject); setDirty(true); }} className="admin-select">
                <option value="maths">Mathematics</option>
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="combined">Combined</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Duration (minutes)</label>
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={e => { setDurationMinutes(Math.max(1, Number(e.target.value) || 60)); setDirty(true); }}
                className="admin-input"
              />
            </div>
          </div>
          <label className="flex items-start gap-3 mt-5 pt-5 border-t border-gray-100 cursor-pointer">
            <input
              type="checkbox"
              checked={showScore}
              onChange={e => { setShowScore(e.target.checked); setDirty(true); }}
              className="w-4 h-4 mt-0.5 accent-[#1a237e] shrink-0"
            />
            <span className="text-sm text-gray-700">Show score to student after submission</span>
          </label>
        </section>

        {problems.length > 0 && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-xs font-bold text-red-800 mb-1.5">{problems.length} problem{problems.length > 1 ? 's' : ''} to fix before saving:</p>
            <ul className="text-xs text-red-700 list-disc pl-4 space-y-0.5">
              {problems.slice(0, 6).map((p, i) => <li key={i}>{p}</li>)}
              {problems.length > 6 && <li>…and {problems.length - 6} more</li>}
            </ul>
          </div>
        )}

        {/* Questions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-bold text-[#1a237e]">Questions ({questions.length})</h2>
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500">{questions.filter(q => q.imageURL).length} with an image</p>
              {pasteIndex === null && questions.length > 0 && (
                <button
                  onClick={() => { setPasteIndex(0); setPasteNote(''); }}
                  className="btn btn-ghost text-xs py-1.5 px-3"
                >
                  Start pasting screenshots
                </button>
              )}
            </div>
          </div>

          {pasteIndex === null && (
            <p className="text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-3.5 py-2.5">
              Tip: hit <strong>Start pasting screenshots</strong> (or <strong>Paste</strong> on any question), then just
              screenshot and press {navigatorIsMac ? '⌘V' : 'Ctrl+V'} — no need to save files first. It moves to the next question automatically.
            </p>
          )}

          {questions.map((q, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={q.id} className="admin-card !p-0 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <span className="w-7 h-7 rounded-lg bg-[#1a237e]/10 text-[#1a237e] text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-800 truncate">
                      {q.questionText.trim()
                        ? q.questionText.slice(0, 90)
                        : <span className="italic text-gray-400">Untitled question</span>}
                    </span>
                    {q.imageURL && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                        Image
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setPasteIndex(pasteIndex === idx ? null : idx); setPasteNote(''); }}
                      title="Paste a screenshot into this question"
                      className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-colors ${
                        pasteIndex === idx
                          ? 'bg-[#1a237e] text-white'
                          : 'text-[#1a237e] bg-indigo-50 hover:bg-indigo-100'
                      }`}
                    >
                      {pasteIndex === idx ? 'Pasting…' : 'Paste'}
                    </button>
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} title="Move up"
                      className="w-7 h-7 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">↑</button>
                    <button onClick={() => move(idx, 1)} disabled={idx === questions.length - 1} title="Move down"
                      className="w-7 h-7 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">↓</button>
                    <button onClick={() => removeQuestion(idx)} title="Remove"
                      className="w-7 h-7 rounded-md text-red-500 hover:bg-red-50">✕</button>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-4">
                    <div>
                      <label className="admin-label">Question text</label>
                      <textarea
                        value={q.questionText}
                        onChange={e => patchQuestion(idx, { questionText: e.target.value })}
                        placeholder="Enter question text… (leave blank if the image holds the whole question)"
                        className="admin-textarea"
                      />
                    </div>

                    <ImageUpload
                      value={q.imageURL ?? ''}
                      onChange={url => patchQuestion(idx, { imageURL: url || null })}
                      label="Photo / diagram for this question"
                    />

                    <div>
                      <label className="admin-label">Question type</label>
                      <div className="seg" role="tablist">
                        {([['mcq', 'Multiple choice'], ['numerical', 'Numerical answer']] as const).map(([t, lbl]) => (
                          <button
                            key={t}
                            role="tab"
                            aria-selected={(q.questionType ?? 'mcq') === t}
                            onClick={() => patchQuestion(idx, { questionType: t })}
                            className="seg-item"
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(q.questionType ?? 'mcq') === 'numerical' ? (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                        <label className="admin-label">Correct answer (value)</label>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={q.numericalAnswer ?? ''}
                            onChange={e => patchQuestion(idx, {
                              numericalAnswer: e.target.value === '' ? null : Number(e.target.value),
                            })}
                            placeholder="e.g. 30.00"
                            className="admin-input font-mono max-w-[10rem]"
                          />
                          <span className="text-xs text-gray-500 font-semibold">to (optional)</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={q.numericalAnswerMax ?? ''}
                            onChange={e => patchQuestion(idx, {
                              numericalAnswerMax: e.target.value === '' ? null : Number(e.target.value),
                            })}
                            placeholder="upper bound"
                            className="admin-input font-mono max-w-[10rem]"
                          />
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2">
                          No options for numerical questions — the student types the value.
                          +4 if correct, 0 otherwise.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="admin-label">Options</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {(['A', 'B', 'C', 'D'] as const).map(letter => (
                            <div key={letter} className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                                {letter}
                              </span>
                              <input
                                value={q.options[letter]}
                                onChange={e => patchOption(idx, letter, e.target.value)}
                                placeholder={`Option ${letter}`}
                                className={`admin-input pl-8 ${q.correctOption === letter ? '!border-emerald-500 bg-emerald-50/40' : ''}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {(q.questionType ?? 'mcq') !== 'numerical' && (
                        <div>
                          <label className="admin-label">Correct answer</label>
                          <select
                            value={q.correctOption}
                            onChange={e => patchQuestion(idx, { correctOption: e.target.value as Question['correctOption'] })}
                            className="admin-select"
                          >
                            {(['A', 'B', 'C', 'D'] as const).map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="admin-label">Subject</label>
                        <select
                          value={q.subject}
                          onChange={e => patchQuestion(idx, { subject: e.target.value as Subject })}
                          className="admin-select"
                        >
                          <option value="maths">Maths</option>
                          <option value="physics">Physics</option>
                          <option value="chemistry">Chemistry</option>
                        </select>
                      </div>
                      <div>
                        <label className="admin-label">Difficulty</label>
                        <select
                          value={q.difficulty}
                          onChange={e => patchQuestion(idx, { difficulty: e.target.value as Difficulty })}
                          className="admin-select"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={addQuestion}
            className="w-full py-3.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-semibold hover:border-[#1565c0] hover:text-[#1565c0] hover:bg-blue-50/40 transition-colors"
          >
            + Add question
          </button>
        </section>
      </div>

      {/* Paste mode bar */}
      {pasteIndex !== null && (
        <div className="fixed bottom-20 inset-x-0 z-40 px-5 pointer-events-none">
          <div className="max-w-4xl mx-auto bg-[#1a237e] text-white rounded-xl shadow-2xl px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 pointer-events-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${pasteBusy ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-sm font-bold shrink-0">
                Paste into Q{pasteIndex + 1}
              </span>
              <span className="text-xs text-white/70 truncate">
                {pasteNote || `Take a screenshot, then press ${navigatorIsMac ? '⌘V' : 'Ctrl+V'}`}
              </span>
            </div>

            <div className="flex items-center gap-3 ml-auto shrink-0">
              <label className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={e => setAutoAdvance(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-400"
                />
                Auto-advance
              </label>
              <button
                onClick={() => setPasteIndex(Math.max(0, pasteIndex - 1))}
                disabled={pasteIndex === 0}
                className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm"
                title="Previous question"
              >↑</button>
              <button
                onClick={() => setPasteIndex(Math.min(questions.length - 1, pasteIndex + 1))}
                disabled={pasteIndex >= questions.length - 1}
                className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm"
                title="Next question"
              >↓</button>
              <button
                onClick={() => { setPasteIndex(null); setPasteNote(''); }}
                className="text-xs font-bold px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20"
              >
                Done (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_20px_rgba(16,24,40,0.06)]">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <strong className="text-gray-900">{questions.length}</strong> question{questions.length === 1 ? '' : 's'}
            {problems.length > 0 && <span className="text-red-600"> · {problems.length} to fix</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/admin/tests')} className="btn btn-ghost">Cancel</button>
            <button onClick={handleSave} disabled={saving || !dirty || problems.length > 0} className="btn btn-success px-7">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
