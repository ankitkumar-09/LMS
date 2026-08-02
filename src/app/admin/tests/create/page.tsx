'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createTest } from '@/lib/firebase/firestore';
import { Subject, Difficulty } from '@/lib/types';
import ImageUpload from '@/components/ImageUpload';
import { parseQuestionsJSON, ImportError, SAMPLE_JSON } from '@/lib/utils/questionImport';

interface QuestionInput {
  questionText: string;
  imageURL: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  subject: Subject;
  difficulty: Difficulty;
}

const emptyQuestion = (): QuestionInput => ({
  questionText: '',
  imageURL: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOption: 'A',
  subject: 'maths',
  difficulty: 'medium',
});

export default function CreateTestPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<Subject>('maths');
  const [showScore, setShowScore] = useState(false);
  const [questions, setQuestions] = useState<QuestionInput[]>([emptyQuestion()]);
  const [bulkText, setBulkText] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdPin, setCreatedPin] = useState('');
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk' | 'json'>('json');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [importError, setImportError] = useState('');
  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') !== 'true') {
      router.push('/admin');
    }
  }, [router]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const updateQuestion = (index: number, field: keyof QuestionInput, value: string) => {
    setQuestions(prev => {
      const updated = [...prev];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updated[index] as any)[field] = value;
      return updated;
    });
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const parseBulk = () => {
    const blocks = bulkText.split('---').map(b => b.trim()).filter(Boolean);
    const parsed: QuestionInput[] = [];

    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim());
      const q: QuestionInput = emptyQuestion();

      for (const line of lines) {
        if (line.startsWith('Q:')) q.questionText = line.slice(2).trim();
        else if (line.startsWith('A:')) q.optionA = line.slice(2).trim();
        else if (line.startsWith('B:')) q.optionB = line.slice(2).trim();
        else if (line.startsWith('C:')) q.optionC = line.slice(2).trim();
        else if (line.startsWith('D:')) q.optionD = line.slice(2).trim();
        else if (line.startsWith('ANS:')) q.correctOption = line.slice(4).trim().toUpperCase() as 'A' | 'B' | 'C' | 'D';
        else if (line.startsWith('SUBJECT:')) q.subject = line.slice(8).trim().toLowerCase() as Subject;
        else if (line.startsWith('DIFFICULTY:')) q.difficulty = line.slice(11).trim().toLowerCase() as Difficulty;
        else if (line.startsWith('IMG:')) q.imageURL = line.slice(4).trim();
      }

      if (q.questionText) parsed.push(q);
    }

    if (parsed.length > 0) {
      setQuestions(prev => [...prev, ...parsed]);
      setBulkText('');
      showToast(`${parsed.length} questions parsed and added!`);
    } else {
      showToast('No questions could be parsed. Check the format.');
    }
  };

  const handleJSONFile = async (file: File | undefined | null) => {
    if (!file) return;
    setImportError('');
    setImportIssues([]);
    try {
      const text = await file.text();
      const result = parseQuestionsJSON(text);

      // Replace rather than append, so re-uploading a corrected file doesn't duplicate
      setQuestions(result.questions.map(q => ({ ...q })));
      if (result.title) setTitle(result.title);
      if (result.subject) setSubject(result.subject);
      if (result.durationMinutes) setDurationMinutes(result.durationMinutes);
      if (typeof result.showScoreToStudent === 'boolean') setShowScore(result.showScoreToStudent);
      setImportIssues(result.warnings);
      setActiveTab('manual');
      showToast(`Loaded ${result.questions.length} questions from ${file.name}`);
    } catch (err) {
      setImportError(err instanceof ImportError ? err.message : 'Could not read that file.');
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_JSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // A question counts as ready once it has a stem or an image
  const readyQuestions = questions.filter(q => q.questionText.trim() || q.imageURL);
  const readyCount = readyQuestions.length;
  const withImages = readyQuestions.filter(q => q.imageURL).length;

  const handleCreate = async () => {
    if (!title.trim()) {
      showToast('Please enter a test title');
      return;
    }

    const validQuestions = readyQuestions;
    if (validQuestions.length === 0) {
      showToast('Add at least one question');
      return;
    }

    setCreating(true);
    try {
      const formattedQuestions = validQuestions.map((q, i) => ({
        questionNumber: i + 1,
        questionText: q.questionText,
        imageURL: q.imageURL || null,
        options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
        correctOption: q.correctOption,
        subject: subject === 'combined' ? q.subject : subject,
        difficulty: q.difficulty,
      }));

      const test = await createTest(title, subject, formattedQuestions, showScore, durationMinutes);
      setCreatedPin(test.pin);
    } catch (err) {
      console.error(err);
      showToast('Error creating test');
      setCreating(false);
    }
  };

  // Success state
  if (createdPin) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-[#1a237e] mb-2">Test Created Successfully!</h2>
          <p className="text-gray-500 text-sm mb-6">{title}</p>

          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">Test PIN:</p>
            <div className="text-3xl font-mono font-bold text-[#1a237e] tracking-widest">{createdPin}</div>
          </div>

          <button
            onClick={() => { navigator.clipboard.writeText(createdPin); showToast('PIN copied!'); }}
            className="w-full py-3 bg-[#1565c0] text-white font-semibold rounded-lg hover:bg-[#0d47a1] mb-3 text-sm"
          >
            📋 Copy PIN
          </button>
          <button
            onClick={() => router.push('/admin/tests')}
            className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 text-sm"
          >
            Go to Test Manager
          </button>
          {toast && <p className="mt-3 text-sm text-green-600">{toast}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-24">
      {/* Nav */}
      <header className="bg-[#1a237e] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-sm text-white/70 hover:text-white transition-colors shrink-0"
          >
            ← Dashboard
          </button>
          <span className="w-px h-5 bg-white/20" />
          <h1 className="text-base sm:text-lg font-bold truncate">Create New Test</h1>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-5 bg-[#1a237e] text-white px-4 py-2.5 rounded-lg shadow-xl text-sm z-50 animate-slide-up">
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-6 space-y-5">
        {/* Test Details */}
        <section className="admin-card">
          <h2 className="font-bold text-[#1a237e] mb-1">Test details</h2>
          <p className="text-xs text-gray-500 mb-5">A PIN is generated automatically when you create the test.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="admin-label">Test title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Mathematics Mock Test 1"
                className="admin-input"
              />
            </div>
            <div>
              <label className="admin-label">Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value as Subject)} className="admin-select">
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
                onChange={e => setDurationMinutes(Math.max(1, Number(e.target.value) || 60))}
                className="admin-input"
              />
              <p className="text-[11px] text-gray-400 mt-1.5">Defaults to 60 minutes (1 hour)</p>
            </div>
          </div>

          <label className="flex items-start gap-3 mt-5 pt-5 border-t border-gray-100 cursor-pointer group">
            <input
              type="checkbox"
              checked={showScore}
              onChange={e => setShowScore(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-[#1a237e] shrink-0"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              Show score to student after submission
            </span>
          </label>
        </section>

        {/* Tab Switch */}
        <div className="seg" role="tablist">
          {([['json', 'Upload JSON'], ['manual', 'Manual Entry'], ['bulk', 'Bulk Paste']] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className="seg-item"
            >
              {label}
            </button>
          ))}
        </div>

        {/* JSON Upload */}
        {activeTab === 'json' && (
          <div className="admin-card">
            <h2 className="font-bold text-[#1a237e] mb-1">Upload a question paper (JSON)</h2>
            <p className="text-xs text-gray-500 mb-5">
              Upload as many questions as you like — 30, 20, whatever the paper has. Title,
              subject and duration are picked up from the file when present.
            </p>

            <div
              onClick={() => jsonInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleJSONFile(e.dataTransfer.files?.[0]); }}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 hover:border-[#1565c0] hover:bg-blue-50/40 bg-gray-50/60 px-4 py-12 text-center cursor-pointer transition-colors"
            >
              <svg className="w-9 h-9 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6H16a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-700 font-semibold">Click to choose a .json file, or drag it here</p>
              <p className="text-xs text-gray-400 mt-1.5">Questions are replaced, not appended</p>
              <input
                ref={jsonInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={e => handleJSONFile(e.target.files?.[0])}
              />
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-blue-50 border border-blue-100 px-3.5 py-3">
              <span className="text-blue-500 text-sm leading-none mt-0.5">ℹ</span>
              <p className="text-xs text-blue-900 leading-relaxed">
                No image URLs in your file? No problem. After uploading, open <strong>Manual Entry</strong>
                {' '}to attach a diagram to any question — and you can still add or change images later
                from the test&apos;s page.
              </p>
            </div>

            <button onClick={downloadTemplate} className="mt-4 text-xs text-[#1565c0] hover:underline font-semibold">
              ⬇ Download a template file
            </button>

            {importError && (
              <pre className="mt-3 whitespace-pre-wrap bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">{importError}</pre>
            )}

            {importIssues.length > 0 && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-800 mb-1">
                  Imported with {importIssues.length} note{importIssues.length > 1 ? 's' : ''}:
                </p>
                <ul className="text-xs text-amber-700 list-disc pl-4 space-y-0.5">
                  {importIssues.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}
                  {importIssues.length > 10 && <li>…and {importIssues.length - 10} more</li>}
                </ul>
              </div>
            )}

            <details className="mt-4">
              <summary className="text-xs text-gray-500 cursor-pointer font-semibold">Expected format</summary>
              <pre className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] overflow-x-auto">{SAMPLE_JSON}</pre>
            </details>
          </div>
        )}

        {/* Bulk Add */}
        {activeTab === 'bulk' && (
          <div className="admin-card">
            <h2 className="font-bold text-[#1a237e] mb-2">Bulk Add Questions</h2>
            <p className="text-xs text-gray-500 mb-3">
              Format: Each question separated by --- (three dashes). Use Q:, A:, B:, C:, D:, ANS:, SUBJECT:, DIFFICULTY:, IMG: prefixes.
            </p>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={`Q: What is the SI unit of force?\nA: Newton\nB: Joule\nC: Watt\nD: Pascal\nANS: A\nSUBJECT: physics\nDIFFICULTY: easy\n---\nQ: Next question here...\nA: Option A\nB: Option B\nC: Option C\nD: Option D\nANS: C\nSUBJECT: physics\nDIFFICULTY: medium`}
              className="admin-textarea h-64 font-mono text-xs"
            />
            <button onClick={parseBulk} className="btn btn-success mt-3">
              Parse &amp; add questions
            </button>
          </div>
        )}

        {/* Manual Questions */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx} className="admin-card">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#1a237e]/10 text-[#1a237e] text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h3 className="font-bold text-sm text-gray-800">Question {idx + 1}</h3>
                    {q.imageURL && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        Image
                      </span>
                    )}
                  </div>
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(idx)} className="text-xs text-red-600 hover:text-red-800 font-semibold">
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="admin-label">Question text</label>
                    <textarea
                      value={q.questionText}
                      onChange={e => updateQuestion(idx, 'questionText', e.target.value)}
                      placeholder="Enter question text…"
                      className="admin-textarea"
                    />
                  </div>

                  <ImageUpload
                    value={q.imageURL}
                    onChange={url => updateQuestion(idx, 'imageURL', url)}
                  />

                  <div>
                    <label className="admin-label">Options</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {(['A', 'B', 'C', 'D'] as const).map(letter => (
                        <div key={letter} className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                            {letter}
                          </span>
                          <input
                            value={q[`option${letter}` as 'optionA' | 'optionB' | 'optionC' | 'optionD']}
                            onChange={e => updateQuestion(idx, `option${letter}` as keyof QuestionInput, e.target.value)}
                            placeholder={`Option ${letter}`}
                            className="admin-input pl-8"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="admin-label">Correct answer</label>
                      <select value={q.correctOption} onChange={e => updateQuestion(idx, 'correctOption', e.target.value)} className="admin-select">
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                    {subject === 'combined' && (
                      <div>
                        <label className="admin-label">Subject</label>
                        <select value={q.subject} onChange={e => updateQuestion(idx, 'subject', e.target.value)} className="admin-select">
                          <option value="maths">Maths</option>
                          <option value="physics">Physics</option>
                          <option value="chemistry">Chemistry</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="admin-label">Difficulty</label>
                      <select value={q.difficulty} onChange={e => updateQuestion(idx, 'difficulty', e.target.value)} className="admin-select">
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addQuestion}
              className="w-full py-3.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-semibold hover:border-[#1565c0] hover:text-[#1565c0] hover:bg-blue-50/40 transition-colors"
            >
              + Add question
            </button>
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_20px_rgba(16,24,40,0.06)]">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <strong className="text-gray-900">{readyCount}</strong> question{readyCount === 1 ? '' : 's'} ready
            {withImages > 0 && <span className="text-gray-400"> · {withImages} with image</span>}
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || readyCount === 0}
            className="btn btn-success px-7 py-2.5"
          >
            {creating ? 'Creating…' : 'Create test & generate PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}
