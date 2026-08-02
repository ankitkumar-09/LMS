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
export function calculateScore(
  responses: Record<string, QuestionResponse>,
  questions: Question[]
): ScoreResult {
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;

  questions.forEach((question) => {
    const response = responses[question.questionNumber.toString()];

    if (!response || !response.selected || response.status === "not_visited" || response.status === "not_answered") {
      unattemptedCount++;
    } else if (response.selected === question.correctOption) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const score = (correctCount * 4) - (wrongCount * 1);
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
