// ===== Firestore Data Types =====

export type Subject = "maths" | "physics" | "chemistry" | "combined";
export type Difficulty = "easy" | "medium" | "hard";
export type TestStatus = "not_attempted" | "in_progress" | "submitted";
export type QuestionStatus = "not_visited" | "not_answered" | "answered" | "marked_for_review" | "answered_and_marked";

export interface Question {
  id: string;
  questionNumber: number;
  questionText: string;
  imageURL: string | null;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: "A" | "B" | "C" | "D";
  subject: Subject;
  difficulty: Difficulty;
}

// Question without correct answer (sent to student)
export interface StudentQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  imageURL: string | null;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  subject: Subject;
}

export interface Test {
  id: string;
  title: string;
  subject: Subject;
  durationMinutes: number;
  totalQuestions: number;
  pin: string;
  pinUsed: boolean;
  status: TestStatus;
  showScoreToStudent: boolean;
  createdAt: number; // timestamp ms
}

export interface QuestionResponse {
  selected: string | null; // "A", "B", "C", "D" or null
  status: QuestionStatus;
}

export interface Attempt {
  id: string;
  testId: string;
  pin: string;
  startedAt: number;
  submittedAt: number | null;
  responses: Record<string, QuestionResponse>; // keyed by questionNumber
  score: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  timeTaken: number; // seconds
  /** Set when the test was ended automatically rather than by the student. */
  terminationReason?: "screenshot" | "time_up" | null;
  /** 1 for the first sitting, 2+ for retests. */
  attemptNumber?: number;
  /** Set on archived attempts, so history can be ordered. */
  archivedAt?: number;
}

export interface QuestionBankItem {
  id: string;
  questionText: string;
  imageURL: string | null;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: "A" | "B" | "C" | "D";
  subject: Subject;
  difficulty: Difficulty;
  chapter?: string;
  usedInTests: string[];
}

// ===== UI State Types =====

export interface ExamState {
  currentQuestion: number; // 1-indexed
  responses: Record<number, QuestionResponse>; // keyed by question number
  timeRemaining: number; // seconds
  isSubmitted: boolean;
}

// Color mapping for question palette
export const QUESTION_STATUS_COLORS: Record<QuestionStatus, { bg: string; text: string; label: string }> = {
  not_visited: { bg: "#808080", text: "#ffffff", label: "Not Visited" },
  not_answered: { bg: "#d32f2f", text: "#ffffff", label: "Not Answered" },
  answered: { bg: "#388e3c", text: "#ffffff", label: "Answered" },
  marked_for_review: { bg: "#7b1fa2", text: "#ffffff", label: "Marked for Review" },
  answered_and_marked: { bg: "#7b1fa2", text: "#ffffff", label: "Answered & Marked for Review" },
};
