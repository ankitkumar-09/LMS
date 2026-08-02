import { Subject, Difficulty } from "@/lib/types";

/**
 * Parser for the admin "Upload JSON" button.
 *
 * Accepts either a bare array of questions:
 *   [ { "questionText": "...", "options": {...}, "correctOption": "A" }, ... ]
 *
 * or a full paper object:
 *   { "title": "...", "subject": "maths", "durationMinutes": 60,
 *     "showScoreToStudent": true, "questions": [ ... ] }
 *
 * Option keys are flexible: "options": {A,B,C,D} or flat optionA/optionB/… or "A".."D".
 */

export interface ImportedQuestion {
  questionText: string;
  imageURL: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  subject: Subject;
  difficulty: Difficulty;
}

export interface ImportResult {
  title?: string;
  subject?: Subject;
  durationMinutes?: number;
  showScoreToStudent?: boolean;
  questions: ImportedQuestion[];
  warnings: string[];
}

export class ImportError extends Error {}

const SUBJECTS: Subject[] = ["maths", "physics", "chemistry", "combined"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const str = (v: any): string => (v === null || v === undefined ? "" : String(v).trim());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readOption(q: any, letter: "A" | "B" | "C" | "D"): string {
  const opts = q.options ?? q.option ?? {};
  return str(
    opts[letter] ??
      opts[letter.toLowerCase()] ??
      q[`option${letter}`] ??
      q[`option${letter.toLowerCase()}`] ??
      q[letter] ??
      q[letter.toLowerCase()]
  );
}

export function parseQuestionsJSON(raw: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new ImportError(
      `That file isn't valid JSON. ${err instanceof Error ? err.message : ""}`.trim()
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root = data as any;
  const list = Array.isArray(root) ? root : root?.questions;

  if (!Array.isArray(list)) {
    throw new ImportError(
      'Expected either an array of questions, or an object with a "questions" array.'
    );
  }
  if (list.length === 0) {
    throw new ImportError("The file contains no questions.");
  }

  const warnings: string[] = [];
  const questions: ImportedQuestion[] = [];

  list.forEach((q, i) => {
    const label = `Question ${i + 1}`;

    if (typeof q !== "object" || q === null) {
      warnings.push(`${label}: skipped — not an object.`);
      return;
    }

    const questionText = str(q.questionText ?? q.question ?? q.text ?? q.q);
    const imageURL = str(q.imageURL ?? q.imageUrl ?? q.image ?? q.img);

    if (!questionText && !imageURL) {
      warnings.push(`${label}: skipped — no question text or image.`);
      return;
    }

    const optionA = readOption(q, "A");
    const optionB = readOption(q, "B");
    const optionC = readOption(q, "C");
    const optionD = readOption(q, "D");

    if (![optionA, optionB, optionC, optionD].every(Boolean)) {
      warnings.push(`${label}: skipped — all four options (A–D) are required.`);
      return;
    }

    const answer = str(q.correctOption ?? q.answer ?? q.ans ?? q.correct).toUpperCase();
    if (!["A", "B", "C", "D"].includes(answer)) {
      warnings.push(`${label}: skipped — correctOption must be A, B, C or D (got "${answer}").`);
      return;
    }

    const rawSubject = str(q.subject).toLowerCase();
    let subject: Subject = "maths";
    if (rawSubject) {
      if (SUBJECTS.includes(rawSubject as Subject)) {
        subject = rawSubject as Subject;
      } else {
        warnings.push(`${label}: unknown subject "${rawSubject}", defaulted to maths.`);
      }
    }

    const rawDifficulty = str(q.difficulty).toLowerCase();
    let difficulty: Difficulty = "medium";
    if (rawDifficulty) {
      if (DIFFICULTIES.includes(rawDifficulty as Difficulty)) {
        difficulty = rawDifficulty as Difficulty;
      } else {
        warnings.push(`${label}: unknown difficulty "${rawDifficulty}", defaulted to medium.`);
      }
    }

    questions.push({
      questionText,
      imageURL,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption: answer as "A" | "B" | "C" | "D",
      subject,
      difficulty,
    });
  });

  if (questions.length === 0) {
    throw new ImportError(
      `No usable questions found.\n${warnings.slice(0, 5).join("\n")}`
    );
  }

  const result: ImportResult = { questions, warnings };

  if (!Array.isArray(root)) {
    const title = str(root.title ?? root.name);
    if (title) result.title = title;

    const subject = str(root.subject).toLowerCase();
    if (SUBJECTS.includes(subject as Subject)) result.subject = subject as Subject;

    const mins = Number(root.durationMinutes ?? root.duration);
    if (Number.isFinite(mins) && mins > 0) result.durationMinutes = Math.round(mins);

    if (typeof root.showScoreToStudent === "boolean") {
      result.showScoreToStudent = root.showScoreToStudent;
    }
  }

  return result;
}

/** A ready-to-edit template the admin can download. */
export const SAMPLE_JSON = JSON.stringify(
  {
    title: "Mathematics Mock Test 1",
    subject: "maths",
    durationMinutes: 60,
    showScoreToStudent: true,
    questions: [
      {
        questionText: "The value of ∫ from 0 to 1 of x² dx is",
        imageURL: null,
        options: { A: "1/2", B: "1/3", C: "1/4", D: "1" },
        correctOption: "B",
        subject: "maths",
        difficulty: "easy",
      },
      {
        questionText: "Refer to the figure. The shaded area equals",
        imageURL: "https://res.cloudinary.com/your-cloud/image/upload/figure.png",
        options: { A: "2 sq units", B: "4 sq units", C: "6 sq units", D: "8 sq units" },
        correctOption: "C",
        subject: "maths",
        difficulty: "medium",
      },
    ],
  },
  null,
  2
);
