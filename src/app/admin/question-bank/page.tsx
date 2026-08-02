'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getQuestionBank, addToQuestionBank, deleteFromQuestionBank } from '@/lib/firebase/firestore';
import { QuestionBankItem, Subject, Difficulty } from '@/lib/types';
import ImageUpload from '@/components/ImageUpload';

type SingleForm = {
  questionText: string;
  imageURL: string;
  A: string; B: string; C: string; D: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  subject: Subject;
  difficulty: Difficulty;
  chapter: string;
};

const emptyForm = (): SingleForm => ({
  questionText: '', imageURL: '',
  A: '', B: '', C: '', D: '',
  correctOption: 'A', subject: 'maths', difficulty: 'medium', chapter: '',
});

export default function QuestionBankPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumping this re-runs the data effect; used after create/delete/seed actions.
  const [reloadKey, setReloadKey] = useState(0);
  const loadQuestions = () => setReloadKey(k => k + 1);
  const [filter, setFilter] = useState<string>('all');
  const [bulkText, setBulkText] = useState('');
  const [toast, setToast] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [form, setForm] = useState<SingleForm>(emptyForm());
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') !== 'true') {
      router.push('/admin');
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const qs = await getQuestionBank(filter);
      if (!cancelled) setQuestions(qs);
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [router, filter, reloadKey]);


  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const parseBulk = async () => {
    const blocks = bulkText.split('---').map(b => b.trim()).filter(Boolean);
    const parsed: Omit<QuestionBankItem, 'id' | 'usedInTests'>[] = [];

    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim());
      const q: Record<string, string> = {};

      for (const line of lines) {
        if (line.startsWith('Q:')) q.questionText = line.slice(2).trim();
        else if (line.startsWith('A:')) q.optionA = line.slice(2).trim();
        else if (line.startsWith('B:')) q.optionB = line.slice(2).trim();
        else if (line.startsWith('C:')) q.optionC = line.slice(2).trim();
        else if (line.startsWith('D:')) q.optionD = line.slice(2).trim();
        else if (line.startsWith('ANS:')) q.correctOption = line.slice(4).trim().toUpperCase();
        else if (line.startsWith('SUBJECT:')) q.subject = line.slice(8).trim().toLowerCase();
        else if (line.startsWith('DIFFICULTY:')) q.difficulty = line.slice(11).trim().toLowerCase();
        else if (line.startsWith('IMG:')) q.imageURL = line.slice(4).trim();
        else if (line.startsWith('CHAPTER:')) q.chapter = line.slice(8).trim();
      }

      if (q.questionText) {
        parsed.push({
          questionText: q.questionText,
          imageURL: q.imageURL || null,
          options: { A: q.optionA || '', B: q.optionB || '', C: q.optionC || '', D: q.optionD || '' },
          correctOption: (q.correctOption || 'A') as 'A' | 'B' | 'C' | 'D',
          subject: (q.subject || 'maths') as Subject,
          difficulty: (q.difficulty || 'medium') as Difficulty,
          chapter: q.chapter,
        });
      }
    }

    if (parsed.length > 0) {
      await addToQuestionBank(parsed);
      setBulkText('');
      showToastMsg(`${parsed.length} questions added to bank!`);
      loadQuestions();
    } else {
      showToastMsg('No questions could be parsed.');
    }
  };

  const saveSingle = async () => {
    if (!form.questionText.trim() && !form.imageURL) {
      showToastMsg('Add question text or an image');
      return;
    }
    if (![form.A, form.B, form.C, form.D].every(o => o.trim())) {
      showToastMsg('All four options are required');
      return;
    }
    setSaving(true);
    try {
      await addToQuestionBank([{
        questionText: form.questionText.trim(),
        imageURL: form.imageURL || null,
        options: { A: form.A.trim(), B: form.B.trim(), C: form.C.trim(), D: form.D.trim() },
        correctOption: form.correctOption,
        subject: form.subject,
        difficulty: form.difficulty,
        chapter: form.chapter.trim() || undefined,
      }]);
      setForm(emptyForm());
      showToastMsg('Question added to bank');
      loadQuestions();
    } catch (err) {
      console.error(err);
      showToastMsg('Could not save the question');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this question from the bank?')) {
      await deleteFromQuestionBank(id);
      showToastMsg('Question deleted');
      loadQuestions();
    }
  };

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Nav */}
      <header className="bg-[#1a237e] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => router.push('/admin/dashboard')} className="text-sm text-white/70 hover:text-white transition-colors shrink-0">← Dashboard</button>
          <span className="w-px h-5 bg-white/20" />
          <h1 className="text-base sm:text-lg font-bold truncate">Question Bank</h1>
          <div className="ml-auto">
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="text-sm bg-[#2e7d32] hover:bg-[#276b2a] px-4 py-1.5 rounded-lg font-semibold transition-colors"
            >
              {showAdd ? 'Close' : '+ Add questions'}
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-[#1a237e] text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>
      )}

      <div className="max-w-5xl mx-auto p-6 space-y-4">
        {/* Add Section */}
        {showAdd && (
          <div className="admin-card">
            <div className="seg mb-5" role="tablist">
              {(['single', 'bulk'] as const).map(m => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={addMode === m}
                  onClick={() => setAddMode(m)}
                  className="seg-item"
                >
                  {m === 'single' ? 'Single Question' : 'Bulk Paste'}
                </button>
              ))}
            </div>

            {addMode === 'single' && (
              <div className="space-y-3">
                <textarea
                  value={form.questionText}
                  onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))}
                  placeholder="Question text… (leave blank if the image contains the whole question)"
                  className="admin-textarea h-24"
                />

                <ImageUpload
                  value={form.imageURL}
                  onChange={url => setForm(f => ({ ...f, imageURL: url }))}
                  label="Diagram / figure (optional)"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(['A', 'B', 'C', 'D'] as const).map(opt => (
                    <input
                      key={opt}
                      value={form[opt]}
                      onChange={e => setForm(f => ({ ...f, [opt]: e.target.value }))}
                      placeholder={`Option ${opt}`}
                      className="admin-input"
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="admin-label">Correct answer</label>
                    <select
                      value={form.correctOption}
                      onChange={e => setForm(f => ({ ...f, correctOption: e.target.value as SingleForm['correctOption'] }))}
                      className="admin-select"
                    >
                      {(['A', 'B', 'C', 'D'] as const).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="admin-label">Subject</label>
                    <select
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value as Subject }))}
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
                      value={form.difficulty}
                      onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Difficulty }))}
                      className="admin-select"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="admin-label">Chapter</label>
                    <input
                      value={form.chapter}
                      onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))}
                      placeholder="optional"
                      className="admin-input"
                    />
                  </div>
                </div>

                <button
                  onClick={saveSingle}
                  disabled={saving}
                  className="btn btn-success"
                >
                  {saving ? 'Saving…' : 'Add to Bank'}
                </button>
              </div>
            )}

            {addMode === 'bulk' && (
            <>
            <h2 className="font-bold text-[#1a237e] mb-2">Bulk Add Questions</h2>
            <p className="text-xs text-gray-500 mb-3">
              Format: Q:, A:, B:, C:, D:, ANS:, SUBJECT:, DIFFICULTY:, CHAPTER: (optional), IMG: (optional). Separate with ---
            </p>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={`Q: What is Newton's second law?\nA: F = ma\nB: F = mv\nC: F = m/a\nD: F = a/m\nANS: A\nSUBJECT: physics\nDIFFICULTY: easy\nCHAPTER: Laws of Motion\n---`}
              className="admin-textarea h-48 font-mono text-xs"
            />
            <button onClick={parseBulk} className="btn btn-success mt-3">
              Parse & Add to Bank
            </button>
            </>
            )}
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Filter:</span>
          {['all', 'physics', 'chemistry', 'maths'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${filter === s ? 'bg-[#1a237e] text-white' : 'bg-white text-gray-600 border'}`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <span className="text-sm text-gray-400 ml-auto">{questions.length} questions</span>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="admin-card text-center py-12">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-gray-500">No questions in the bank yet</p>
            <p className="text-sm text-gray-400 mt-1">Use the bulk add feature above to add questions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {questions.map((q, idx) => (
              <div key={q.id} className="admin-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.subject === 'physics' ? 'bg-blue-100 text-blue-700' :
                        q.subject === 'chemistry' ? 'bg-purple-100 text-purple-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {q.subject}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor(q.difficulty)}`}>
                        {q.difficulty}
                      </span>
                      {q.chapter && (
                        <span className="text-xs text-gray-400">{q.chapter}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 mb-2">{q.questionText}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                      <span>A: {q.options.A}</span>
                      <span>B: {q.options.B}</span>
                      <span>C: {q.options.C}</span>
                      <span>D: {q.options.D}</span>
                    </div>
                    <div className="mt-1 text-xs">
                      <span className="text-gray-500">Answer: </span>
                      <span className="font-bold text-green-700">{q.correctOption}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(q.id)} className="text-xs text-red-500 hover:text-red-700 shrink-0">
                    🗑️
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
