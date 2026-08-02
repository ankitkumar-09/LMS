import { db } from "./config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { Test, Question, Attempt, QuestionResponse, QuestionBankItem, TestStatus } from "../types";
import { generatePIN } from "../utils/pin";
import { calculateScore } from "../utils/scoring";
import { MATHS_PAPERS } from "../seed/mathsPapers";

// ===== TEST OPERATIONS =====

export async function getTestByPin(pin: string): Promise<Test | null> {
  const q = query(collection(db, "tests"), where("pin", "==", pin.toUpperCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Test;
}

export async function getTest(testId: string): Promise<Test | null> {
  const docSnap = await getDoc(doc(db, "tests", testId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Test;
}

export async function getAllTests(): Promise<Test[]> {
  const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Test));
}

export async function createTest(
  title: string,
  subject: Test["subject"],
  questions: Omit<Question, "id">[],
  showScoreToStudent: boolean = false,
  durationMinutes: number = 60
): Promise<Test> {
  const testId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const pin = generatePIN();

  const testData: Omit<Test, "id"> = {
    title,
    subject,
    durationMinutes,
    totalQuestions: questions.length,
    pin,
    pinUsed: false,
    status: "not_attempted",
    showScoreToStudent,
    createdAt: Date.now(),
  };

  await setDoc(doc(db, "tests", testId), testData);

  // Add questions as subcollection
  const batch = writeBatch(db);
  questions.forEach((q, index) => {
    const qId = `q_${index + 1}`;
    batch.set(doc(db, "tests", testId, "questions", qId), {
      ...q,
      questionNumber: index + 1,
    });
  });
  await batch.commit();

  return { id: testId, ...testData };
}

export async function updateTest(testId: string, data: Partial<Test>): Promise<void> {
  await updateDoc(doc(db, "tests", testId), data);
}

export async function deleteTest(testId: string): Promise<void> {
  // Delete questions subcollection first
  const questionsSnapshot = await getDocs(collection(db, "tests", testId, "questions"));
  const batch = writeBatch(db);
  questionsSnapshot.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "tests", testId));
  await batch.commit();

  // Also delete attempt if exists
  try {
    await deleteDoc(doc(db, "attempts", testId));
  } catch {
    // Attempt may not exist
  }
}

export async function regeneratePin(testId: string): Promise<string> {
  const newPin = generatePIN();

  // Clear the old attempt too. Leaving it behind meant the next student's
  // startAttempt() saw an existing attempt and the test never left "not_attempted".
  await deleteDoc(doc(db, "attempts", testId)).catch(() => {});

  await updateDoc(doc(db, "tests", testId), {
    pin: newPin,
    pinUsed: false,
    status: "not_attempted",
  });
  return newPin;
}

// ===== QUESTION OPERATIONS =====

export async function getTestQuestions(testId: string): Promise<Question[]> {
  const snapshot = await getDocs(
    query(collection(db, "tests", testId, "questions"), orderBy("questionNumber"))
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
}

/**
 * Reopen a test so it can be taken again, keeping the same PIN.
 * Clears the previous attempt and resets the status.
 */
export async function resetTest(testId: string): Promise<void> {
  await deleteDoc(doc(db, "attempts", testId)).catch(() => {});
  await updateDoc(doc(db, "tests", testId), {
    pinUsed: false,
    status: "not_attempted",
  });
}

/** Update a single question's content. */
export async function updateQuestion(
  testId: string,
  questionId: string,
  data: Partial<Omit<Question, "id">>
): Promise<void> {
  await updateDoc(doc(db, "tests", testId, "questions", questionId), data);
}

/** Save every question of a test in one batch. */
export async function saveQuestions(
  testId: string,
  questions: Question[]
): Promise<void> {
  const batch = writeBatch(db);
  questions.forEach((q, index) => {
    const questionNumber = index + 1;
    batch.set(doc(db, "tests", testId, "questions", q.id), {
      id: q.id,
      questionNumber,
      questionText: q.questionText,
      imageURL: q.imageURL ?? null,
      options: q.options,
      correctOption: q.correctOption,
      subject: q.subject,
      difficulty: q.difficulty,
    });
  });
  await batch.commit();
  await updateDoc(doc(db, "tests", testId), { totalQuestions: questions.length });
}

/** Remove a question and renumber the rest. */
export async function deleteQuestion(testId: string, questionId: string): Promise<void> {
  await deleteDoc(doc(db, "tests", testId, "questions", questionId));
  const remaining = await getTestQuestions(testId);
  await saveQuestions(testId, remaining);
}

/**
 * Attach, replace or remove a question's image after the test has been created.
 * Pass null to clear it.
 */
export async function updateQuestionImage(
  testId: string,
  questionId: string,
  imageURL: string | null
): Promise<void> {
  await updateDoc(doc(db, "tests", testId, "questions", questionId), { imageURL });
}

// ===== ATTEMPT OPERATIONS =====

export async function getAttempt(testId: string): Promise<Attempt | null> {
  const docSnap = await getDoc(doc(db, "attempts", testId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Attempt;
}

/** Every attempt on record, keyed by testId. */
export async function getAllAttempts(): Promise<Record<string, Attempt>> {
  const snapshot = await getDocs(collection(db, "attempts"));
  const out: Record<string, Attempt> = {};
  snapshot.docs.forEach((d) => {
    out[d.id] = { id: d.id, ...d.data() } as Attempt;
  });
  return out;
}

export async function startAttempt(testId: string, pin: string): Promise<void> {
  const existing = await getAttempt(testId);

  if (existing) {
    // Resuming. Still reconcile the test's status: if we returned early here the
    // test would sit on "not_attempted" forever whenever an attempt doc already
    // existed (e.g. after regenerating the PIN).
    const status: TestStatus = existing.submittedAt ? "submitted" : "in_progress";
    await updateDoc(doc(db, "tests", testId), { status });
    return;
  }

  // Seed the unattempted count from the test's real question count, not a fixed 30
  const test = await getTest(testId);

  const attemptData: Omit<Attempt, "id"> = {
    testId,
    pin,
    startedAt: Date.now(),
    submittedAt: null,
    responses: {},
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    unattemptedCount: test?.totalQuestions ?? 0,
    timeTaken: 0,
  };

  await setDoc(doc(db, "attempts", testId), attemptData);
  await updateDoc(doc(db, "tests", testId), { status: "in_progress" });
}

export async function saveProgress(
  testId: string,
  responses: Record<string, QuestionResponse>
): Promise<void> {
  await updateDoc(doc(db, "attempts", testId), { responses });
}

export async function submitTest(
  testId: string,
  responses: Record<string, QuestionResponse>,
  timeTaken: number,
  terminationReason: Attempt["terminationReason"] = null
): Promise<{ score: number; correctCount: number; wrongCount: number; unattemptedCount: number }> {
  // Get questions with correct answers
  const questions = await getTestQuestions(testId);

  // Calculate score
  const result = calculateScore(responses, questions);

  // Update attempt
  await updateDoc(doc(db, "attempts", testId), {
    responses,
    submittedAt: Date.now(),
    score: result.score,
    correctCount: result.correctCount,
    wrongCount: result.wrongCount,
    unattemptedCount: result.unattemptedCount,
    timeTaken,
    terminationReason,
  });

  // Lock the test PIN
  await updateDoc(doc(db, "tests", testId), {
    pinUsed: true,
    status: "submitted",
  });

  return result;
}

// ===== QUESTION BANK OPERATIONS =====

export async function getQuestionBank(subject?: string): Promise<QuestionBankItem[]> {
  let q;
  if (subject && subject !== "all") {
    q = query(collection(db, "questionBank"), where("subject", "==", subject));
  } else {
    q = query(collection(db, "questionBank"));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as QuestionBankItem));
}

export async function addToQuestionBank(
  questions: Omit<QuestionBankItem, "id" | "usedInTests">[]
): Promise<void> {
  const batch = writeBatch(db);
  questions.forEach((q) => {
    const qId = `qb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    batch.set(doc(db, "questionBank", qId), {
      ...q,
      usedInTests: [],
    });
  });
  await batch.commit();
}

export async function deleteFromQuestionBank(questionId: string): Promise<void> {
  await deleteDoc(doc(db, "questionBank", questionId));
}

/**
 * Seed the real Mathematics papers.
 *
 * Test ids are derived from each paper's slug, so re-running this updates the existing
 * documents instead of piling up duplicates.
 */
export async function seedMockTests(): Promise<{ seeded: number; questions: number }> {
  let questionCount = 0;

  for (const paper of MATHS_PAPERS) {
    const testId = `test_${paper.slug}`;

    const testData: Omit<Test, "id"> = {
      title: paper.title,
      subject: "maths",
      durationMinutes: paper.durationMinutes,
      totalQuestions: paper.questions.length,
      pin: paper.pin,
      pinUsed: false,
      status: "not_attempted",
      showScoreToStudent: true,
      createdAt: Date.now(),
    };

    await setDoc(doc(db, "tests", testId), testData);

    // Clear any previous questions so a shorter re-seed doesn't leave orphans behind
    const existing = await getDocs(collection(db, "tests", testId, "questions"));
    if (!existing.empty) {
      const clearBatch = writeBatch(db);
      existing.docs.forEach((d) => clearBatch.delete(d.ref));
      await clearBatch.commit();
    }

    const batch = writeBatch(db);
    paper.questions.forEach((q, index) => {
      const questionNumber = index + 1;
      const qId = `q_${questionNumber}`;
      batch.set(doc(db, "tests", testId, "questions", qId), {
        id: qId,
        questionNumber,
        questionText: q.questionText,
        imageURL: q.imageURL,
        options: q.options,
        correctOption: q.correctOption,
        subject: q.subject,
        difficulty: q.difficulty,
      });
    });
    await batch.commit();

    // A fresh paper should not inherit a previous attempt
    await deleteDoc(doc(db, "attempts", testId)).catch(() => {});

    questionCount += paper.questions.length;
  }

  return { seeded: MATHS_PAPERS.length, questions: questionCount };
}
