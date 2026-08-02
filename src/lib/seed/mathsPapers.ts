import { Question } from "@/lib/types";

/**
 * Seed data: Mathematics papers transcribed from ALLEN JEE(Main) All India Open Test
 * booklets (Section-I, single-correct MCQs).
 *
 * Answer keys were extracted from the accompanying solution booklets and cross-checked
 * against the per-question "Ans. (X)" headers in the worked solutions, so every
 * correctOption below is the answer to the question printed next to it.
 *
 * Questions whose original notation could not be reproduced faithfully in plain text
 * (stacked matrices, figures, Venn diagrams) were left out rather than risk pairing an
 * answer with a garbled stem. Add those through Admin -> Question Bank, where you can
 * attach the original figure as an image.
 */

export type SeedQuestion = Omit<Question, "id" | "questionNumber"> & {
  /** Question number in the original ALLEN booklet, kept for traceability. */
  sourceNumber: number;
};

export interface SeedPaper {
  /** Stable id so re-running the seeder updates rather than duplicates. */
  slug: string;
  title: string;
  pin: string;
  durationMinutes: number;
  source: string;
  questions: SeedQuestion[];
}

const m = (
  sourceNumber: number,
  questionText: string,
  options: { A: string; B: string; C: string; D: string },
  correctOption: "A" | "B" | "C" | "D",
  difficulty: SeedQuestion["difficulty"] = "medium"
): SeedQuestion => ({
  sourceNumber,
  questionText,
  imageURL: null,
  options,
  correctOption,
  subject: "maths",
  difficulty,
});

const paper29Jan: SeedPaper = {
  slug: "allen-aiot-29-jan-maths",
  title: "ALLEN AIOT — Mathematics (29 Jan)",
  pin: "102",
  durationMinutes: 60,
  source: "ALLEN JEE(Main) All India Open Test, 29-01-2021, Part 3 — Mathematics, Section-I",
  questions: [
    m(1, "If the coefficient of x²¹ in the expansion of (x² + 3λ/x)¹⁵ is 3640, then the value of λ equals",
      { A: "4/3", B: "2/3", C: "1/3", D: "5/3" }, "B"),

    m(2, "The value of ∫ from −π/2 to π/2 of dx / [(1 + tan²x)(1 + 2ˣ)] equals",
      { A: "π/2", B: "π/8", C: "π", D: "π/4" }, "D"),

    m(3, "The number of integers in the domain of the function f(x) = √(3 − 2ˣ − 2¹⁻ˣ) is",
      { A: "1", B: "4", C: "2", D: "3" }, "C"),

    m(4, "If one root of the quadratic equation λx² + λx + (λ + 1) = 0 is less than 1 and the other is greater than 1, then the complete range of values of λ is (where λ ∈ R)",
      { A: "λ ∈ (−1/4, 0)", B: "λ ∈ (0, 1/4)", C: "λ ∈ (−1/3, 0)", D: "λ ∈ (0, 1/3)" }, "C"),

    m(5, "The sum of infinite terms of the series 1 + 2/3 + 6/3² + 10/3³ + 14/3⁴ + … is",
      { A: "4", B: "6", C: "2", D: "3" }, "D"),

    m(6, "Let x² + y² − 4x − 2y − 11 = 0 be a circle. A pair of tangents from the point P(4, 5) together with a pair of radii form a quadrilateral of area",
      { A: "4", B: "8", C: "16", D: "12" }, "B"),

    m(7, "If f(x) = 1/x for x ≥ 1 and f(x) = ax² + b for x < 1 is differentiable everywhere, and k = a + b, then the value of k is",
      { A: "−1", B: "2", C: "0", D: "1" }, "D"),

    m(8, "The negation of the statement “If a quadrilateral is a square then it is a rhombus” is",
      {
        A: "If a quadrilateral is not a square then it is a rhombus.",
        B: "If a quadrilateral is a square then it is not a rhombus.",
        C: "A quadrilateral is a square and it is not a rhombus.",
        D: "A quadrilateral is not a square and it is a rhombus.",
      }, "C"),

    m(9, "The variance of the data 2001, 2003, 2006, 2007, 2009, 2010 is",
      { A: "7", B: "10", C: "9", D: "8" }, "B", "easy"),

    m(10, "If a⃗ = î + 6ĵ + 3k̂, b⃗ = 3î + 2ĵ + k̂ and c⃗ = (α + 1)î + (β − 1)ĵ + k̂ are linearly dependent vectors and |c⃗| = 6, then the sum of all possible values of (α + β) is (α, β ∈ R)",
      { A: "2", B: "6", C: "8", D: "4" }, "D", "hard"),

    m(11, "The area bounded by the curves y² = x and x² = −y is equal to",
      { A: "1/3", B: "2/3", C: "3/4", D: "5/3" }, "A"),

    m(12, "The solution of the differential equation x dy = −y dx + xy dx/√(1 − x²) is (where x ∈ (−1, 1))",
      {
        A: "logₑ|xy| = sin⁻¹x + C",
        B: "logₑ|xy| = 2 sin⁻¹x + C",
        C: "logₑ|x + y| = sin⁻¹x + C",
        D: "logₑ|x + y| = 2 sin⁻¹x + C",
      }, "A", "hard"),

    m(13, "The conic represented by x = 4(cos t − sin t) and y = 5(cos t + sin t), where t is a parameter, is a",
      { A: "Circle", B: "Ellipse", C: "Parabola", D: "Hyperbola" }, "B", "easy"),

    m(14, "Consider the pair of straight lines ax² + 3xy − 2y² − 5x + 5y + c = 0 representing perpendicular lines. The value of |a + c| equals",
      { A: "1", B: "2", C: "3", D: "4" }, "A"),

    m(15, "All the words formed by writing all the letters of the word ZENITH are arranged as in an English dictionary. The position of the word ZENITH (from the beginning) is",
      { A: "598", B: "602", C: "532", D: "616" }, "D"),

    m(16, "The relation R = {(1,1), (2,2), (3,3), (1,2), (2,1), (2,3), (3,2)} is defined on the set A = {n : 3ⁿ > 4n − 1, n ∈ N}. The relation R is a",
      {
        A: "reflexive relation",
        B: "symmetric relation",
        C: "transitive relation",
        D: "equivalence relation",
      }, "B"),

    m(17, "Let S = {(a, b) : A³ = A}, where A is the 2 × 2 matrix with first row (1/2, 1/2) and second row (a, b). Then n(S) equals (where n(X) denotes the number of elements in set X)",
      { A: "2", B: "3", C: "4", D: "5" }, "B", "hard"),
  ],
};

const paper8Feb: SeedPaper = {
  slug: "allen-aiot-08-feb-maths",
  title: "ALLEN AIOT — Mathematics (8 Feb)",
  pin: "202",
  durationMinutes: 60,
  source: "ALLEN JEE(Main) All India Open Test, 08-02-2021, Part 3 — Mathematics, Section-I",
  questions: [
    m(1, "If the line x = y = z intersects the lines (sin A)x + (sin B)y + (sin C)z = 2d² and (sin 2A)x + (sin 2B)y + (sin 2C)z = d², then the value of sin(A/2)·sin(B/2)·sin(C/2) is (where A, B, C are the angles of a triangle)",
      { A: "1/4", B: "1/8", C: "1/16", D: "1/2" }, "C", "hard"),

    m(3, "Let f(x) = sin x + cos x + tan x + sin⁻¹x + tan⁻¹x + cos⁻¹x. If M and m are the maximum and minimum values of f(x), then M + m is",
      { A: "π + 2cos 1", B: "π + 2sin 1", C: "π/2 + 2tan 1", D: "π + tan 1 + sin 1" }, "A", "hard"),

    m(4, "The diagonals of a rhombus ABCD intersect at (1, 2) and two of its sides are parallel to the lines x − y + 2 = 0 and 7x − y + 3 = 0. If the vertex A is (0, k), then the value of k could be",
      { A: "2/5", B: "3/5", C: "5/2", D: "5/3" }, "C"),

    m(5, "The centre of the family of circles cutting the family of circles x² + y² + 2x(λ − 3/2) + 6y(λ − 2/3) − 8(λ + 4) = 0 orthogonally, lies on",
      { A: "x − y − 1 = 0", B: "x + 3y − 4 = 0", C: "4x + 3y + 7 = 0", D: "3x − 4y − 1 = 0" }, "B", "hard"),

    m(6, "P, Q, R and S are four points on the tangent at P to y² = 4ax such that PQ : QR : RS = 2 : 5 : 7. Perpendiculars from Q, R and S on the double ordinate of P cut the parabola at M, N and K respectively (Q, R, S being on the same side of the tangent at P). If RN = 3, then SK/QM is equal to",
      { A: "4", B: "9", C: "49", D: "144" }, "C", "hard"),

    m(7, "If the length of the latus rectum of the ellipse x²/(a² + 2) + y²/(a² + 5) = 1 is 4, then the eccentricity is",
      { A: "1/3", B: "1/2", C: "1/√2", D: "none of these" }, "A"),

    m(8, "A straight line intersects the same branch of the hyperbola x²/a² − y²/b² = 1 at P₁ and P₂, and meets its asymptotes at Q₁ and Q₂. Then P₁Q₂ − P₂Q₁ is equal to",
      { A: "a − b", B: "a² + b² − ab", C: "0", D: "a² − b²" }, "C"),

    m(9, "If z₁, z₂, z₃ are three points lying on the circle |z| = 2, then the minimum value of |z₁ + z₂|² + |z₂ + z₃|² + |z₃ + z₁|² is equal to",
      { A: "6", B: "12", C: "15", D: "24" }, "B", "hard"),

    m(10, "If the sum of the series S = 1 + 5/11 + 12/11² + 22/11³ + 35/11⁴ + … ∞ can be expressed as a rational number p/q in its lowest form, then the value of (p + q) equals",
      { A: "2573", B: "2753", C: "2375", D: "2537" }, "A", "hard"),

    m(11, "All the roots of x³ + ax² + bx + c = 0 are positive integers greater than 2, and the coefficients satisfy a + b + c + 1 = −385. Find the value of a.",
      { A: "−26", B: "−27", C: "−28", D: "−30" }, "A", "hard"),

    m(12, "The number of 6-digit numbers such that (a) the digits of each number are all from the set {1, 2, 3, 4, 5}, and (b) any digit that appears in the number appears at least twice, is equal to (Example: 225252 is admissible, while 222133 is not)",
      { A: "900", B: "1250", C: "1255", D: "1405" }, "D", "hard"),

    m(14, "Die A has 2 white and 4 red faces, whereas die B has 4 white and 2 red faces. A coin is flipped once. If it shows a head, die A is thrown n times; if it shows a tail, die B is thrown n times. If the probability that die A was thrown, given that red turns up every time, is 32/33, then the value of n is",
      { A: "5", B: "6", C: "7", D: "4" }, "A", "hard"),

    m(15, "Let there be two sets A and B such that A = {a, b} and n(B) = 4. Then the total number of possible relations defined from set B to set A is",
      { A: "2²", B: "2³", C: "2⁶", D: "2^(2³)" }, "D"),

    m(16, "Let S be the set of all square matrices of order 2. A relation R is defined on S such that A R B ⇒ AB = O, where O is the null square matrix of order 2. Then the relation R is (A, B ∈ S)",
      { A: "Reflexive", B: "Transitive", C: "Symmetric", D: "Not an equivalence relation" }, "D"),

    m(17, "A man on the top of a vertical tower observes a car moving at uniform speed coming directly towards it. If it takes 12(√3 − 1) minutes for the angle of depression to change from 30° to 45°, then the car will reach the tower in",
      { A: "17 minutes", B: "12 minutes", C: "16 minutes", D: "18 minutes" }, "B"),

    m(18, "If n is an even positive integer, then the condition that the greatest term in the expansion of (1 + x)ⁿ may also have the greatest coefficient is",
      {
        A: "n/(n + 2) < x < (n + 2)/n",
        B: "(n + 1)/n < x < n/(n + 1)",
        C: "n/(n + 4) < x < (n + 4)/n",
        D: "none of these",
      }, "A", "hard"),

    m(20, "A data set consists of n observations x₁, x₂, …, xₙ. If Σ(xᵢ + 1)² = 9n and Σ(xᵢ − 1)² = 5n, then the standard deviation of this data is",
      { A: "5", B: "2", C: "√5", D: "√7" }, "C"),
  ],
};

export const MATHS_PAPERS: SeedPaper[] = [paper29Jan, paper8Feb];
