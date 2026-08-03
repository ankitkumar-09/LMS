"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { getTestQuestions, getAttempt, getTest, saveProgress, submitTest } from "@/lib/firebase/firestore";
import { Test, StudentQuestion, Question, QuestionResponse, QuestionStatus } from "@/lib/types";
import VirtualCalculator from '@/components/VirtualCalculator';

/** Firestore keys must be strings; responses are keyed by number in local state. */
export function toDbResponses(source: Record<number, QuestionResponse>) {
  const dbResponses: Record<string, QuestionResponse> = {};
  Object.entries(source).forEach(([k, v]) => {
    dbResponses[k] = v;
  });
  return dbResponses;
}

export default function ExamPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [responses, setResponses] = useState<Record<number, QuestionResponse>>({});
  /**
   * Synchronous mirror of `responses`.
   *
   * React state updates are async, so two handlers firing in the same tick (e.g.
   * "Save & Next" -> navigateTo) would both read the pre-update value and the second
   * write would clobber the first. Every read/write below goes through this ref so
   * an answer can never be overwritten by a stale copy.
   */
  const responsesRef = useRef<Record<number, QuestionResponse>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  
  // Proctoring & Review States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pausedReason, setPausedReason] = useState("");
  const [pauseCount, setPauseCount] = useState(0);
  const [copyNotice, setCopyNotice] = useState("");
  const [terminated, setTerminated] = useState<"screenshot" | null>(null);
  const [saveError, setSaveError] = useState("");
  const [isReviewMode, setIsReviewMode] = useState(false);
  // Populated only after submission, so answers can never leak mid-test
  const [answerKey, setAnswerKey] = useState<Record<number, Question["correctOption"]>>({});
  const [violationWarning, setViolationWarning] = useState(false);

  // Timer interval ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Holds the latest auto-submit closure so the timer effect never captures stale state
  const autoSubmitRef = useRef<() => void>(() => {});
  const screenshotSubmitRef = useRef<() => void>(() => {});

  useEffect(() => {
    const initTest = async () => {
      try {
        const testData = await getTest(testId);
        if (!testData) {
          router.push("/");
          return;
        }
        setTest(testData);

        const qData = await getTestQuestions(testId);
        // Strip correct option so answers never reach the browser
        const studentQs = qData.map((q) => {
          const rest: Record<string, unknown> = { ...q };
          delete rest.correctOption;
          return rest as unknown as StudentQuestion;
        });
        setQuestions(studentQs);

        if (studentQs.length === 0) {
          setLoadError("This test has no questions yet. Please contact your administrator.");
          setLoading(false);
          return;
        }

        const attempt = await getAttempt(testId);

        const initialResponses: Record<number, QuestionResponse> = {};
        if (attempt) {
          if (attempt.submittedAt) {
            setIsReviewMode(true);
            setTimeRemaining(0);
            // Only once the test is submitted is it safe to reveal the answer key
            const key: Record<number, Question["correctOption"]> = {};
            qData.forEach((q) => { key[q.questionNumber] = q.correctOption; });
            setAnswerKey(key);
          } else {
            // Persistent Timer via LocalStorage or calculated elapsed
            const savedTime = localStorage.getItem(`test_${testId}_time`);
            if (savedTime) {
              setTimeRemaining(parseInt(savedTime, 10));
            } else {
              const elapsed = Math.floor((Date.now() - attempt.startedAt) / 1000);
              const remaining = Math.max(0, (testData.durationMinutes * 60) - elapsed);
              setTimeRemaining(remaining);
            }
          }
          
          // Parse responses (keyed by string in db, convert to number)
          Object.entries(attempt.responses).forEach(([k, v]) => {
            initialResponses[parseInt(k)] = v;
          });
        } else {
          setTimeRemaining(testData.durationMinutes * 60);
          localStorage.setItem(`test_${testId}_time`, (testData.durationMinutes * 60).toString());
        }

        // Initialize responses for questions that don't have them
        studentQs.forEach(q => {
          if (!initialResponses[q.questionNumber]) {
            initialResponses[q.questionNumber] = {
              selected: null,
              status: q.questionNumber === 1 ? "not_answered" : "not_visited"
            };
          }
        });
        setResponses(initialResponses);

        // Find first question to show
        let firstQ = 0;
        if (attempt && attempt.responses) {
          // find first not visited or not answered
          const index = studentQs.findIndex(q => 
            initialResponses[q.questionNumber]?.status === "not_visited" || 
            initialResponses[q.questionNumber]?.status === "not_answered"
          );
          if (index !== -1) firstQ = index;
        }
        setCurrentQIndex(firstQ);

        // Mark first question as not_answered if it was not_visited
        const firstQNum = studentQs[firstQ]?.questionNumber;
        if (firstQNum !== undefined && initialResponses[firstQNum]?.status === "not_visited") {
          initialResponses[firstQNum].status = "not_answered";
        }
        responsesRef.current = { ...initialResponses };
        setResponses({ ...initialResponses });

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoadError("We couldn't load this test. Please go back and try again.");
        setLoading(false);
      }
    };
    initTest();
  }, [testId, router]);

  // The exam is live only while fullscreen and unpaused. The timer interval is
  // torn down the instant that stops being true, so no extra second can elapse.
  const isPaused = !isFullscreen || violationWarning;

  useEffect(() => {
    if (loading || isReviewMode || isPaused) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          autoSubmitRef.current();
          return 0;
        }
        localStorage.setItem(`test_${testId}_time`, newTime.toString());
        return newTime;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, isReviewMode, isPaused, testId]);

  useEffect(() => {
    if (loading || isReviewMode) return;

    // Single source of truth for "is the exam window actually in front and fullscreen".
    // Recomputed from the live DOM rather than trusted from any one event, because
    // macOS window-fullscreen and some minimise paths don't fire fullscreenchange.
    const sync = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      const focused = document.hasFocus() && !document.hidden;
      setIsFullscreen(inFullscreen);
      if (!inFullscreen || !focused) {
        setViolationWarning(true);
        setPausedReason(
          !inFullscreen
            ? "You left fullscreen mode."
            : document.hidden
              ? "You switched to another tab or minimised the window."
              : "You switched to another window."
        );
      }
    };

    const handleVisibilityChange = sync;
    const handleFullscreenChange = sync;
    const handleBlur = sync;
    const handleResize = sync;

    window.addEventListener("blur", handleBlur);
    window.addEventListener("resize", handleResize);
    window.addEventListener("pagehide", handleBlur);
    // Events cover the normal paths instantly; this is only a fallback for window
    // managers that change state silently. Kept short so worst case is imperceptible.
    const poll = setInterval(sync, 150);
    sync();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      clearInterval(poll);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pagehide", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [loading, isReviewMode]);

  // Block copy / paste / cut / right-click and the usual shortcuts during the exam
  useEffect(() => {
    if (loading || isReviewMode) return;

    const block = (e: Event) => { e.preventDefault(); return false; };

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      // copy, paste, cut, select-all, save, print, view-source, find
      if (mod && ["c", "v", "x", "a", "s", "p", "u", "f"].includes(k)) {
        e.preventDefault();
        setCopyNotice("Copying and pasting are disabled during the test.");
        setTimeout(() => setCopyNotice(""), 2500);
        return;
      }
      // devtools
      if (e.key === "F12" || (mod && e.shiftKey && ["i", "j", "c"].includes(k))) {
        e.preventDefault();
      }
    };

    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("keydown", onKeyDown);

    // Belt and braces: also disable text selection visually
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [loading, isReviewMode]);

  const requestFullscreen = async () => {
    try {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
      // Only clear the pause once the browser confirms we're actually fullscreen
      if (document.fullscreenElement) {
        setIsFullscreen(true);
        setViolationWarning(false);
        setPausedReason("");
        setPauseCount(c => c + 1);
      }
    } catch (err) {
      console.error("Error attempting to enable full-screen mode:", err);
      setPausedReason("Your browser blocked fullscreen. Allow it and try again.");
    }
  };

  const handleAutoSubmit = async (reason: "screenshot" | "time_up" | null = null) => {
    if (isSubmitting || isReviewMode) return;
    setIsSubmitting(true);
    if (reason === "screenshot") setTerminated("screenshot");
    try {
      const attempt = await getAttempt(testId);
      if (!attempt) {
        setIsSubmitting(false);
        return;
      }

      const timeTaken = Math.floor((Date.now() - attempt.startedAt) / 1000);
      // Read from the ref, not the render closure, so a selection made moments
      // before hitting submit is always included.
      const dbResponses = toDbResponses(responsesRef.current);

      await submitTest(testId, dbResponses, timeTaken, reason);
      localStorage.removeItem(`test_${testId}_time`);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      // For a screenshot termination, hold on the explanation screen instead of
      // silently redirecting, so the student knows why the test ended.
      if (reason !== "screenshot") {
        router.push(`/test/${testId}/result`);
      }
    } catch (err) {
      console.error("Failed to submit test", err);
      setIsSubmitting(false);
      setTerminated(null);
      alert("Submission failed. Please check your connection and try again.");
    }
  };

  // Keep the ref pointing at the freshest closure for the timer's zero-callback
  useEffect(() => {
    autoSubmitRef.current = () => { void handleAutoSubmit("time_up"); };
    screenshotSubmitRef.current = () => { void handleAutoSubmit("screenshot"); };
  });

  // Screenshot attempts end the test immediately.
  useEffect(() => {
    if (loading || isReviewMode || terminated) return;

    const isScreenshotCombo = (e: KeyboardEvent) => {
      // Windows / Linux: PrintScreen, and Win+Shift+S (Snip & Sketch)
      if (e.key === "PrintScreen") return true;
      if (e.shiftKey && e.metaKey && e.key.toLowerCase() === "s") return true;
      // macOS: Cmd+Shift+3 / 4 / 5. The OS usually swallows these before the
      // browser sees them, so this only catches the cases that do get through.
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) return true;
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      if (isScreenshotCombo(e)) {
        e.preventDefault();
        screenshotSubmitRef.current();
      }
    };

    document.addEventListener("keydown", onKey, true);
    document.addEventListener("keyup", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keyup", onKey, true);
    };
  }, [loading, isReviewMode, terminated]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentQIndex];

  /** Apply an update against the freshest responses and persist it. */
  const applyResponses = (
    updater: (prev: Record<number, QuestionResponse>) => Record<number, QuestionResponse>
  ) => {
    const next = updater(responsesRef.current);
    responsesRef.current = next; // synchronous, so the next call sees this update
    setResponses(next);
    return next;
  };

  const persist = async (snapshot: Record<number, QuestionResponse>) => {
    try {
      await saveProgress(testId, toDbResponses(snapshot));
    } catch (err) {
      console.error("Failed to save progress", err);
      setSaveError("Your last answer could not be saved. Check your connection.");
      setTimeout(() => setSaveError(""), 4000);
    }
  };

  const navigateTo = async (index: number) => {
    const q = questions[index];
    if (!q) return;

    setCurrentQIndex(index);

    if (isReviewMode) return;

    if (responsesRef.current[q.questionNumber]?.status === "not_visited") {
      const next = applyResponses(prev => ({
        ...prev,
        [q.questionNumber]: { ...prev[q.questionNumber], status: "not_answered" },
      }));
      await persist(next);
    }
  };

  const handleOptionSelect = async (option: string) => {
    if (!currentQ || isReviewMode) return;
    const qNum = currentQ.questionNumber;

    // Record the answer immediately rather than waiting for "Save & Next".
    // Previously a selection that wasn't explicitly saved scored zero, so students
    // who picked an option and navigated away silently lost the marks.
    const next = applyResponses(prev => {
      const current = prev[qNum] ?? { selected: null, status: "not_answered" as QuestionStatus };
      const keepsMark = current.status === "marked_for_review" || current.status === "answered_and_marked";
      return {
        ...prev,
        [qNum]: {
          selected: option,
          status: keepsMark ? "answered_and_marked" : "answered",
        },
      };
    });

    await persist(next);
  };

  const handleAction = async (action: "save_next" | "save_mark" | "clear" | "mark_next") => {
    if (!currentQ || isReviewMode) return;
    const qNum = currentQ.questionNumber;

    const next = applyResponses(prev => {
      const current = prev[qNum] ?? { selected: null, status: "not_answered" as QuestionStatus };
      const updated: QuestionResponse = { ...current };

      switch (action) {
        case "save_next":
          updated.status = updated.selected ? "answered" : "not_answered";
          break;
        case "save_mark":
        case "mark_next":
          updated.status = updated.selected ? "answered_and_marked" : "marked_for_review";
          break;
        case "clear":
          updated.selected = null;
          updated.status = "not_answered";
          break;
      }

      return { ...prev, [qNum]: updated };
    });

    await persist(next);

    // Navigate to next if not clear
    if (action !== "clear" && currentQIndex < questions.length - 1) {
      await navigateTo(currentQIndex + 1);
    }
  };

  const getStatusCount = (statusCheck: (status: QuestionStatus) => boolean) => {
    return Object.values(responses).filter(r => statusCheck(r.status)).length;
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-medium text-slate-500">Loading exam environment...</div>;
  }

  if (loadError || !test || !currentQ) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="font-medium text-slate-600 max-w-sm">{loadError ?? "We couldn't load this test."}</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
        >
          Back to Test Portal
        </button>
      </div>
    );
  }

  // Screenshot termination outranks every other screen, including the pause overlay
  if (terminated === "screenshot") {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="bg-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl border border-rose-900/60">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18M10.5 10.677a2 2 0 002.823 2.823M7.362 7.561C5.68 8.74 4.279 10.42 3 12c1.889 2.991 5.282 6 9 6 1.55 0 3.043-.523 4.395-1.35M12 6c4.008 0 6.701 3.158 8.542 6a18.5 18.5 0 01-1.44 2.02" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold mb-3">No screenshots allowed</h2>

          <p className="text-rose-300 font-semibold mb-4">
            That is why your test has been submitted.
          </p>

          <p className="text-slate-300 text-sm leading-relaxed mb-8">
            A screenshot attempt was detected during the assessment. Your answers up to
            this point have been saved and the paper has been submitted automatically.
          </p>

          <button
            onClick={() => router.push(`/test/${testId}/result`)}
            className="w-full py-4 px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
          >
            View result
          </button>
        </div>
      </div>
    );
  }

  if (!isReviewMode && isPaused) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="bg-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl border border-slate-700">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold mb-2">Test paused</h2>

          <div className="inline-flex items-center gap-2 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 mb-5">
            <span className="text-xs text-slate-400">Time frozen at</span>
            <span className="font-mono font-bold tabular-nums text-white">{formatTime(timeRemaining)}</span>
          </div>

          {pausedReason && (
            <p className="text-amber-300 font-semibold mb-3 text-sm">{pausedReason}</p>
          )}

          <p className="text-slate-300 mb-6 leading-relaxed text-sm">
            Your timer stopped the moment you left the exam window and no time is being
            lost. Return to fullscreen to continue — your answers are saved.
          </p>

          {pauseCount > 0 && (
            <p className="text-xs text-slate-500 mb-5">
              This test has been paused {pauseCount} time{pauseCount === 1 ? '' : 's'}.
            </p>
          )}

          <button
            onClick={requestFullscreen}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-lg shadow-lg shadow-indigo-600/30"
          >
            Resume in fullscreen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Review Mode Banner */}
      {isReviewMode && (
        <div className="bg-emerald-500 text-white px-4 py-2 text-center font-bold tracking-widest text-sm shadow-sm flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          TEST COMPLETED - REVIEW MODE
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-3 px-6 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="font-bold text-lg text-slate-800">{test.subject} Test</div>
        <div className="flex-1 text-center font-bold text-slate-700 tracking-wide text-sm sm:text-base hidden sm:block">
          {test?.title || "Mock Test"}
        </div>
        <div className="flex items-center justify-end gap-3 sm:gap-6 min-w-[120px]">
          {isReviewMode ? (
            <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
              <span>Submitted</span>
            </div>
          ) : (
            <div className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg border shadow-sm transition-colors ${timeRemaining < 300 ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-700 bg-white border-slate-200'}`}>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="text-sm sm:text-base tracking-wider tabular-nums">{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        
        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Question {currentQ.questionNumber}</h2>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{test.subject}</span>
              </div>

              <div className="text-slate-700 text-lg mb-8 leading-relaxed">
                {currentQ.questionText}
              </div>

              {currentQ.imageURL && (
                <div className="mb-8 p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <img src={currentQ.imageURL} alt="Question figure" className="max-w-full h-auto" />
                </div>
              )}

              <div className="flex flex-col gap-3">
                {['A', 'B', 'C', 'D'].map((opt) => {
                  const isSelected = responses[currentQ.questionNumber]?.selected === opt;
                  const correct = answerKey[currentQ.questionNumber];
                  const isCorrect = isReviewMode && correct === opt;
                  const isWrongPick = isReviewMode && isSelected && correct !== undefined && correct !== opt;

                  let tone = 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50';
                  if (isCorrect) tone = 'border-emerald-500 bg-emerald-50';
                  else if (isWrongPick) tone = 'border-rose-500 bg-rose-50';
                  else if (isReviewMode) tone = 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed';
                  else if (isSelected) tone = 'border-indigo-600 bg-indigo-50/50 shadow-sm';

                  return (
                    <label
                      key={opt}
                      className={`flex items-start p-4 rounded-xl border-2 transition-all select-none ${
                        isReviewMode ? 'cursor-default' : 'cursor-pointer'
                      } ${tone}`}
                    >
                      <div className="flex items-center h-5">
                        <input
                          type="radio"
                          name={`q-${currentQ.questionNumber}`}
                          value={opt}
                          checked={isSelected}
                          onChange={() => !isReviewMode && handleOptionSelect(opt)}
                          disabled={isReviewMode}
                          className="w-4 h-4 text-indigo-600 bg-white border-slate-300 focus:ring-indigo-600"
                        />
                      </div>
                      <div className={`ml-3 flex-1 ${isCorrect ? 'text-emerald-900 font-semibold' : isWrongPick ? 'text-rose-900' : 'text-slate-700'}`}>
                        {currentQ.options[opt as keyof typeof currentQ.options]}
                      </div>

                      {isCorrect && (
                        <span className="ml-3 shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          Correct answer
                        </span>
                      )}
                      {isWrongPick && (
                        <span className="ml-3 shrink-0 flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                          Your answer
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              {/* Per-question verdict in review mode */}
              {isReviewMode && answerKey[currentQ.questionNumber] && (
                <div className="mt-6 pt-5 border-t border-slate-100">
                  {(() => {
                    const picked = responses[currentQ.questionNumber]?.selected;
                    const correct = answerKey[currentQ.questionNumber];
                    const counted = responses[currentQ.questionNumber]?.status === 'answered'
                      || responses[currentQ.questionNumber]?.status === 'answered_and_marked';

                    if (!picked || !counted) {
                      return (
                        <p className="text-sm font-semibold text-slate-500">
                          Not attempted · 0 marks — the correct answer was{' '}
                          <span className="text-emerald-700">{correct}</span>
                        </p>
                      );
                    }
                    return picked === correct ? (
                      <p className="text-sm font-bold text-emerald-700">Correct · +4 marks</p>
                    ) : (
                      <p className="text-sm font-bold text-rose-700">
                        Incorrect · −1 mark — the correct answer was{' '}
                        <span className="text-emerald-700">{correct}</span>
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>

          {/* Action Bar */}
          {!isReviewMode && (
            <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky bottom-0 z-20">
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => handleAction("save_mark")}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-lg transition-colors text-sm shadow-sm border border-amber-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                  Mark for Review
                </button>
                <button
                  onClick={() => handleAction("clear")}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors text-sm shadow-sm border border-slate-300"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowCalc(v => !v)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors text-sm shadow-sm border border-slate-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m-6 4h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"></path></svg>
                  Calculator
                </button>
              </div>
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => navigateTo(Math.max(0, currentQIndex - 1))}
                  disabled={currentQIndex === 0}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-lg transition-colors text-sm shadow-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleAction("save_next")}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-sm shadow-sm shadow-indigo-600/20"
                >
                  {currentQIndex === questions.length - 1 ? 'Save' : 'Save & Next'}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Right Sidebar - Navigation Panel */}
        <div className="w-full lg:w-80 bg-white border-l border-slate-200 flex flex-col h-[50vh] lg:h-auto shadow-sm" style={{ paddingLeft: '1rem', paddingRight: '1rem' }}>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {/* Grid of questions */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {questions.map((q, idx) => {
                const status = responses[q.questionNumber]?.status || "not_visited";
                let bgColor = "bg-white border-slate-300 text-slate-600 hover:border-slate-400";

                if (isReviewMode) {
                  // After submission the palette grades the paper instead of tracking progress
                  const correct = answerKey[q.questionNumber];
                  const picked = responses[q.questionNumber]?.selected;
                  const counted = status === "answered" || status === "answered_and_marked";
                  if (!counted || !picked) bgColor = "bg-slate-200 border-slate-300 text-slate-600";
                  else if (picked === correct) bgColor = "bg-emerald-500 border-emerald-600 text-white shadow-sm shadow-emerald-500/20";
                  else bgColor = "bg-rose-500 border-rose-600 text-white shadow-sm shadow-rose-500/20";
                }
                else if (status === "answered") bgColor = "bg-emerald-500 border-emerald-600 text-white shadow-sm shadow-emerald-500/20";
                else if (status === "not_answered") bgColor = "bg-rose-500 border-rose-600 text-white shadow-sm shadow-rose-500/20";
                else if (status === "marked_for_review") bgColor = "bg-purple-500 border-purple-600 text-white shadow-sm shadow-purple-500/20";
                else if (status === "answered_and_marked") bgColor = "bg-purple-500 border-purple-600 text-white shadow-sm shadow-purple-500/20";

                return (
                  <button
                    key={q.id}
                    onClick={() => navigateTo(idx)}
                    className={`
                      relative w-full aspect-square flex items-center justify-center rounded-lg font-bold text-sm sm:text-base border-2 transition-all
                      ${idx === currentQIndex ? 'ring-4 ring-indigo-200 scale-105 z-10' : ''}
                      ${bgColor}
                    `}
                  >
                    {q.questionNumber}
                    {!isReviewMode && status === "answered_and_marked" && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {isReviewMode && (
              <div className="mt-5 pt-4 border-t border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-500 shrink-0"></span> Correct
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-3.5 h-3.5 rounded bg-rose-500 shrink-0"></span> Incorrect
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300 shrink-0"></span> Not attempted
                </div>
              </div>
            )}
          </div>

          {!isReviewMode && (
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button 
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-colors uppercase tracking-wider text-sm"
              >
                Submit Test
              </button>
            </div>
          )}
        </div>
      </div>


      {/* Modern Submit Modal */}
      {showSubmitModal && (
        <div className="modal-overlay flex items-center justify-center p-4">
          
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full animate-slide-up relative">
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Submit Test?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to submit? You will not be able to change your answers after submission.</p>
            
            <div className="bg-gray-50 rounded-lg p-5 space-y-3 mb-6 border border-gray-200">
              <div className="flex justify-between items-center font-medium">
                <span className="text-gray-700 flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#28a745]"></span> Answered</span>
                <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-200">{getStatusCount(s => s === "answered" || s === "answered_and_marked")}</span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span className="text-gray-700 flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#dc3545]"></span> Not Answered</span>
                <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-200">{getStatusCount(s => s === "not_answered" || s === "marked_for_review")}</span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span className="text-gray-700 flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#6f42c1]"></span> Marked for Review</span>
                <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-200">{getStatusCount(s => s === "marked_for_review")}</span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span className="text-gray-700 flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#6c757d]"></span> Not Visited</span>
                <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-200">{getStatusCount(s => s === "not_visited")}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSubmitModal(false)} 
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={() => handleAutoSubmit(null)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-[#1e3c72] text-white rounded-lg font-bold hover:bg-[#2a5298] transition-colors disabled:opacity-50 flex justify-center items-center"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : "Submit Test"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Save failure warning — the student must know if an answer didn't persist */}
      {saveError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-sm font-bold px-4 py-2.5 rounded-lg shadow-xl">
          {saveError}
        </div>
      )}

      {/* Copy/paste blocked notice */}
      {copyNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-xl animate-fade-in">
          {copyNotice}
        </div>
      )}

      {/* Virtual Calculator */}
      {showCalc && <VirtualCalculator onClose={() => setShowCalc(false)} />}
    </div>
  );
}
