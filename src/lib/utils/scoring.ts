import { QuestionResponse, Question } from "../types";

export interface ScoreResult {
  score: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  maxScore: number;
}

/**
 * Calculate JEE Mains score
 * +4 for correct, -1 for incorrect, 0 for unattempted
 */
/**
 * Does a typed numerical answer match the key?
 *
 * JEE accepts answers truncated or rounded to two decimals, and some keys are a
 * range ("0.34 to 0.35"), so we compare against the band with a small epsilon
 * rather than testing exact equality on floats.
 */
export function isNumericalCorrect(raw: string | null, question: Question): boolean {
  if (raw === null || raw.trim() === "") return false;

  const value = Number(raw.trim());
  if (!Number.isFinite(value)) return false;

  const low = question.numericalAnswer;
  if (low === null || low === undefined || !Number.isFinite(low)) return false;

  const high = Number.isFinite(question.numericalAnswerMax as number)
    ? (question.numericalAnswerMax as number)
    : low;

  const min = Math.min(low, high);
  const max = Math.max(low, high);

  // Tolerance covers two-decimal truncation as well as float representation error
  const EPS = 0.005 + 1e-9;
  return value >= min - EPS && value <= max + EPS;
}

export function calculateScore(
  responses: Record<string, QuestionResponse>,
  questions: Question[]
): ScoreResult {
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  let score = 0;

  questions.forEach((question) => {
    const response = responses[question.questionNumber.toString()];
    const isNumerical = question.questionType === "numerical";

    const attempted =
      response &&
      response.selected !== null &&
      response.selected !== "" &&
      response.status !== "not_visited" &&
      response.status !== "not_answered";

    if (!attempted) {
      unattemptedCount++;
      return;
    }

    const correct = isNumerical
      ? isNumericalCorrect(response.selected, question)
      : response.selected === question.correctOption;

    if (correct) {
      correctCount++;
      score += 4;
    } else {
      wrongCount++;
      // Section-II numerical questions carry no negative marking
      if (!isNumerical) score -= 1;
    }
  });

  const maxScore = questions.length * 4;

  return {
    score,
    correctCount,
    wrongCount,
    unattemptedCount,
    maxScore,
  };
}

/**
 * Format time from seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format time from seconds to HH:MM:SS
 */
export function formatTimeHMS(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
