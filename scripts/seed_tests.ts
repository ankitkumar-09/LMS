/**
 * Seed the Mathematics papers into Firestore.
 *
 * Run with:   npm run seed
 *
 * Reads Firebase config from .env.local. Re-running is safe: each paper has a stable
 * document id, so existing papers are updated rather than duplicated.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  getFirestore,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { MATHS_PAPERS } from "../src/lib/seed/mathsPapers";

// --- load .env.local (no extra dependency needed) ---------------------------------
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // fall back to whatever is already in the environment
  }
}
loadEnv();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error(
    "Missing Firebase config. Make sure .env.local has NEXT_PUBLIC_FIREBASE_* values."
  );
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log(`Seeding ${MATHS_PAPERS.length} mathematics papers…\n`);

  for (const paper of MATHS_PAPERS) {
    const testId = `test_${paper.slug}`;

    // Sanity check before writing: every question needs 4 options and a valid answer
    for (const q of paper.questions) {
      const opts = [q.options.A, q.options.B, q.options.C, q.options.D];
      if (opts.some((o) => !o?.trim())) {
        throw new Error(`${paper.slug} Q${q.sourceNumber}: missing an option`);
      }
      if (!["A", "B", "C", "D"].includes(q.correctOption)) {
        throw new Error(`${paper.slug} Q${q.sourceNumber}: bad correctOption`);
      }
    }

    await setDoc(doc(db, "tests", testId), {
      title: paper.title,
      subject: "maths",
      durationMinutes: paper.durationMinutes,
      totalQuestions: paper.questions.length,
      pin: paper.pin,
      pinUsed: false,
      status: "not_attempted",
      showScoreToStudent: true,
      createdAt: Date.now(),
    });

    const existing = await getDocs(collection(db, "tests", testId, "questions"));
    if (!existing.empty) {
      const clear = writeBatch(db);
      existing.docs.forEach((d) => clear.delete(d.ref));
      await clear.commit();
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

    await deleteDoc(doc(db, "attempts", testId)).catch(() => {});

    console.log(
      `  ✓ ${paper.title}  —  PIN ${paper.pin}, ${paper.questions.length} questions, ${paper.durationMinutes} min`
    );
  }

  console.log("\nDone.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("\nSeeding failed:", err);
  process.exit(1);
});
