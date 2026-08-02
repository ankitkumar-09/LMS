'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { QuestionResponse, QuestionStatus } from '@/lib/types';
import { formatTimeHMS } from '@/lib/utils/scoring';
import VirtualCalculator from '@/components/VirtualCalculator';

// Sample questions for UI preview
const SAMPLE_QUESTIONS = [
  {
    id: 'q1', questionNumber: 1, subject: 'physics',
    questionText: 'The characteristic distance at which quantum gravitational effects are significant, the Planck length, can be determined from a suitable combination of the fundamental physical constants G, ℏ and c. Which of the following correctly gives the Planck length?',
    imageURL: null,
    options: { A: 'G½ ℏ½ c⁻³⁄²', B: 'G½ ℏ½ c³⁄²', C: 'G ℏ² c³', D: 'G² ℏ c' },
  },
  {
    id: 'q2', questionNumber: 2, subject: 'physics',
    questionText: 'A particle of mass m is moving along the x-axis with initial velocity uî. It collides elastically with a particle of mass 10m at rest and then moves with a velocity (vî + v₁ĵ). If v₁ = √3/2 u, the angle of deviation of the lighter particle from its initial direction is:',
    imageURL: null,
    options: { A: '30°', B: '45°', C: '60°', D: '90°' },
  },
  {
    id: 'q3', questionNumber: 3, subject: 'physics',
    questionText: 'A wire of length L is bent in the form of a circular coil and current I is passed through it. If this coil is placed in a uniform magnetic field, the maximum torque on the coil is:',
    imageURL: null,
    options: { A: 'BIL²/4π', B: 'BIL²/2π', C: 'BIL²/π', D: '2BIL²/π' },
  },
  {
    id: 'q4', questionNumber: 4, subject: 'chemistry',
    questionText: 'The IUPAC name of the following compound CH₃-CH=CH-CHO is:',
    imageURL: null,
    options: { A: 'But-2-enal', B: 'But-2-en-1-al', C: '2-Butenal', D: 'Crotonaldehyde' },
  },
  {
    id: 'q5', questionNumber: 5, subject: 'chemistry',
    questionText: 'Which of the following compounds will show geometrical isomerism?',
    imageURL: null,
    options: { A: '2-Butene', B: 'Propene', C: '2-Methylpropene', D: '1-Butene' },
  },
  {
    id: 'q6', questionNumber: 6, subject: 'chemistry',
    questionText: 'The hybridization of carbon atoms in C-2 and C-3 of CH₂=C=CH₂ are:',
    imageURL: null,
    options: { A: 'sp², sp²', B: 'sp, sp²', C: 'sp², sp', D: 'sp, sp' },
  },
  {
    id: 'q7', questionNumber: 7, subject: 'maths',
    questionText: 'If the sum of the first n terms of an AP is given by Sₙ = 3n² + 2n, then the common difference of the AP is:',
    imageURL: null,
    options: { A: '3', B: '4', C: '6', D: '5' },
  },
  {
    id: 'q8', questionNumber: 8, subject: 'maths',
    questionText: 'The value of tan⁻¹(1) + cos⁻¹(-1/2) + sin⁻¹(-1/2) is equal to:',
    imageURL: null,
    options: { A: 'π/4', B: '3π/4', C: 'π/2', D: '5π/4' },
  },
  {
    id: 'q9', questionNumber: 9, subject: 'maths',
    questionText: 'Let A = {1, 2, 3, 4, 5} and B = {1, 2, 3, 4, 5, 6}. The number of functions f: A → B such that f(1) < f(2) < f(3) is:',
    imageURL: null,
    options: { A: '60', B: '120', C: '240', D: '360' },
  },
  {
    id: 'q10', questionNumber: 10, subject: 'physics',
    questionText: 'Two identical spherical drops of water are falling through air with a steady velocity of 5 cm/s. If both the drops coalesce to form a single drop, the terminal velocity of the new drop will be:',
    imageURL: null,
    options: { A: '5 × 2¹⁄³ cm/s', B: '5 × 2²⁄³ cm/s', C: '5 × 2³⁄² cm/s', D: '5 × 2 cm/s' },
  },
  {
    id: 'q11', questionNumber: 11, subject: 'physics',
    questionText: 'A rod of length L rotates about an axis passing through its centre and perpendicular to it. The angular velocity of the rod is ω. The ratio of centripetal acceleration of a point at the end and a point at a distance L/4 from the centre is:',
    imageURL: null,
    options: { A: '2:1', B: '4:1', C: '1:2', D: '1:4' },
  },
  {
    id: 'q12', questionNumber: 12, subject: 'physics',
    questionText: 'A convex lens of focal length 20 cm produces images of the same magnification 2 when an object is kept at two distances x₁ and x₂ (x₁ > x₂) from the lens. The ratio x₁/x₂ is:',
    imageURL: null,
    options: { A: '2:1', B: '3:1', C: '5:3', D: '4:3' },
  },
  {
    id: 'q13', questionNumber: 13, subject: 'chemistry',
    questionText: 'The correct order of first ionization enthalpy values of the elements is:',
    imageURL: null,
    options: { A: 'B < Be < N < O', B: 'Be < B < N < O', C: 'B < Be < O < N', D: 'Be < B < O < N' },
  },
  {
    id: 'q14', questionNumber: 14, subject: 'chemistry',
    questionText: 'Which of the following molecules has the highest dipole moment?',
    imageURL: null,
    options: { A: 'CH₄', B: 'CHCl₃', C: 'CH₃Cl', D: 'CCl₄' },
  },
  {
    id: 'q15', questionNumber: 15, subject: 'chemistry',
    questionText: 'For a reaction A → B, the rate constant is 0.693 min⁻¹. The half-life of the reaction is:',
    imageURL: null,
    options: { A: '1 min', B: '2 min', C: '0.5 min', D: '1.44 min' },
  },
  {
    id: 'q16', questionNumber: 16, subject: 'maths',
    questionText: 'If |→a| = 3, |→b| = 4 and |→a × →b| = 6, then →a · →b is equal to:',
    imageURL: null,
    options: { A: '6', B: '6√3', C: '6√2', D: '12' },
  },
  {
    id: 'q17', questionNumber: 17, subject: 'maths',
    questionText: 'The distance of the point (1, 2, 3) from the plane x + y + z = 11 along a normal to the plane is:',
    imageURL: null,
    options: { A: '5/√3', B: '3√3', C: '√3', D: '5√3' },
  },
  {
    id: 'q18', questionNumber: 18, subject: 'maths',
    questionText: 'If y = sin⁻¹(3x - 4x³), -1/2 ≤ x ≤ 1/2, then dy/dx is:',
    imageURL: null,
    options: { A: '3/√(1-x²)', B: '-3/√(1-x²)', C: '1/√(1-x²)', D: '-1/√(1-x²)' },
  },
  {
    id: 'q19', questionNumber: 19, subject: 'physics',
    questionText: 'The de-Broglie wavelength associated with a ball of mass 150 g travelling at 30 m/s is: (h = 6.63 × 10⁻³⁴ J·s)',
    imageURL: null,
    options: { A: '1.47 × 10⁻³⁴ m', B: '1.47 × 10⁻³² m', C: '1.47 × 10⁻¹⁹ m', D: '1.47 × 10⁻³¹ m' },
  },
  {
    id: 'q20', questionNumber: 20, subject: 'physics',
    questionText: 'In a Young\'s double slit experiment, the intensity at a point where the path difference is λ/6 (λ being the wavelength of light used) is I. The maximum intensity is:',
    imageURL: null,
    options: { A: 'I/2', B: '4I/3', C: '2I', D: '4I' },
  },
  {
    id: 'q21', questionNumber: 21, subject: 'chemistry',
    questionText: 'The product obtained when toluene is treated with Br₂/FeBr₃ is predominantly:',
    imageURL: null,
    options: { A: 'Benzyl bromide', B: 'p-Bromotoluene', C: 'o-Bromotoluene', D: 'm-Bromotoluene' },
  },
  {
    id: 'q22', questionNumber: 22, subject: 'chemistry',
    questionText: 'Which of the following is the strongest reducing agent?',
    imageURL: null,
    options: { A: 'Li', B: 'Na', C: 'K', D: 'Cs' },
  },
  {
    id: 'q23', questionNumber: 23, subject: 'maths',
    questionText: 'The number of solutions of sin²x + cos⁴x = 1 in [0, 2π] is:',
    imageURL: null,
    options: { A: '2', B: '3', C: '4', D: '5' },
  },
  {
    id: 'q24', questionNumber: 24, subject: 'maths',
    questionText: 'If the vertices of a triangle are (1, 1), (4, 5) and (6, 2), then the area of the triangle is:',
    imageURL: null,
    options: { A: '7 sq. units', B: '7.5 sq. units', C: '8 sq. units', D: '8.5 sq. units' },
  },
  {
    id: 'q25', questionNumber: 25, subject: 'physics',
    questionText: 'An object is placed at a distance of 40 cm in front of a concave mirror of focal length 20 cm. The image formed is:',
    imageURL: null,
    options: { A: 'Real, inverted and of same size', B: 'Real, inverted and smaller', C: 'Virtual, erect and larger', D: 'Real, inverted and larger' },
  },
  {
    id: 'q26', questionNumber: 26, subject: 'physics',
    questionText: 'A capacitor of 4 μF is connected as shown in the circuit. The internal resistance of the battery is 0.5 Ω. The amount of charge on the capacitor plates will be:',
    imageURL: null,
    options: { A: '0 μC', B: '4 μC', C: '16 μC', D: '8 μC' },
  },
  {
    id: 'q27', questionNumber: 27, subject: 'chemistry',
    questionText: 'The number of π bonds present in naphthalene is:',
    imageURL: null,
    options: { A: '3', B: '4', C: '5', D: '7' },
  },
  {
    id: 'q28', questionNumber: 28, subject: 'maths',
    questionText: 'The value of the integral ∫₀¹ x(1-x)⁵ dx is:',
    imageURL: null,
    options: { A: '1/42', B: '1/30', C: '1/12', D: '1/7' },
  },
  {
    id: 'q29', questionNumber: 29, subject: 'maths',
    questionText: 'If the probability of A solving a problem is 1/3 and B solving it is 1/4, then the probability that the problem is solved is:',
    imageURL: null,
    options: { A: '1/2', B: '7/12', C: '1/12', D: '5/12' },
  },
  {
    id: 'q30', questionNumber: 30, subject: 'chemistry',
    questionText: 'The element with electronic configuration [Xe] 4f¹⁴ 5d¹ 6s² is:',
    imageURL: null,
    options: { A: 'Gd', B: 'Lu', C: 'La', D: 'Ce' },
  },
];

export default function SampleExamPage() {
  const [currentQ, setCurrentQ] = useState(1);
  const [responses, setResponses] = useState<Record<number, QuestionResponse>>({
    1: { selected: null, status: 'not_answered' }
  });
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalQ = SAMPLE_QUESTIONS.length;

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const currentQuestion = SAMPLE_QUESTIONS.find(q => q.questionNumber === currentQ);
  const getStatus = (qNum: number): QuestionStatus => responses[qNum]?.status || 'not_visited';

  const getStatusClass = (status: QuestionStatus): string => {
    switch (status) {
      case 'answered': return 'answered';
      case 'not_answered': return 'not-answered';
      case 'marked_for_review': return 'marked';
      case 'answered_and_marked': return 'answered-marked';
      default: return 'not-visited';
    }
  };

  const goToQuestion = (qNum: number) => {
    setCurrentQ(qNum);
    setResponses(prev => {
      if (!prev[qNum]) return { ...prev, [qNum]: { selected: null, status: 'not_answered' } };
      return prev;
    });
  };

  const selectOption = (option: string) => {
    setResponses(prev => ({
      ...prev,
      [currentQ]: {
        selected: option,
        status: prev[currentQ]?.status === 'marked_for_review' || prev[currentQ]?.status === 'answered_and_marked'
          ? 'answered_and_marked' : 'answered',
      }
    }));
  };

  const handleSaveNext = () => {
    if (currentQ < totalQ) goToQuestion(currentQ + 1);
  };

  const handleSaveMarkReview = () => {
    setResponses(prev => ({
      ...prev,
      [currentQ]: {
        selected: prev[currentQ]?.selected || null,
        status: prev[currentQ]?.selected ? 'answered_and_marked' : 'marked_for_review',
      }
    }));
    if (currentQ < totalQ) goToQuestion(currentQ + 1);
  };

  const handleClear = () => {
    setResponses(prev => ({
      ...prev,
      [currentQ]: { selected: null, status: 'not_answered' }
    }));
  };

  const handleMarkReviewNext = () => {
    setResponses(prev => ({
      ...prev,
      [currentQ]: {
        selected: prev[currentQ]?.selected || null,
        status: prev[currentQ]?.selected ? 'answered_and_marked' : 'marked_for_review',
      }
    }));
    if (currentQ < totalQ) goToQuestion(currentQ + 1);
  };

  const answeredCount = Object.values(responses).filter(r => r.status === 'answered' || r.status === 'answered_and_marked').length;
  const notAnsweredCount = Object.values(responses).filter(r => r.status === 'not_answered').length;
  const markedCount = Object.values(responses).filter(r => r.status === 'marked_for_review').length;
  const notVisitedCount = totalQ - Object.keys(responses).length;

  if (submitted) {
    return (
      <div className="min-h-screen bg-dark-gradient relative flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-2xl w-full text-center relative z-10 animate-slide-up">
          <div className="mb-6 text-green-500">
             <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Test Submitted Successfully!</h1>
          <p className="text-gray-500 font-medium mb-8">This was a UI preview — no data was saved.</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
             <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                <div className="text-3xl font-bold text-blue-600 mb-1">{totalQ}</div>
                <div className="text-sm text-blue-800 font-semibold uppercase">Total Qs</div>
             </div>
             <div className="bg-green-50 border border-green-100 p-4 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-1">{answeredCount}</div>
                <div className="text-sm text-green-800 font-semibold uppercase">Attempted</div>
             </div>
             <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                <div className="text-3xl font-bold text-purple-600 mb-1">{markedCount}</div>
                <div className="text-sm text-purple-800 font-semibold uppercase">Marked</div>
             </div>
             <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <div className="text-3xl font-bold text-gray-600 mb-1">{notAnsweredCount + notVisitedCount}</div>
                <div className="text-sm text-gray-800 font-semibold uppercase">Skipped</div>
             </div>
          </div>
          
          <div className="flex gap-4 justify-center">
            <Link href="/" className="px-8 py-3 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors">Return Home</Link>
            <a href="/sample" className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg">Try Again</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100 text-gray-900">
      {/* Top Header */}
      <header className="bg-header-gradient text-white py-3 px-8 md:px-16 xl:px-24 2xl:px-32 flex justify-between items-center shadow-md z-20 shrink-0" style={{ paddingLeft: '4rem', paddingRight: '4rem' }}>
        <div className="flex items-center gap-3">

          <div className="font-bold text-xl tracking-wide">JEE MAIN - MOCK TEST</div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-blue-200 uppercase tracking-widest font-bold mb-0.5">Time Remaining</div>
            <div className={`font-mono font-bold text-2xl tracking-wider ${timeRemaining < 300 ? 'timer-warning' : 'text-white'}`}>
              {formatTimeHMS(timeRemaining)}
            </div>
          </div>
          
          <button 
            onClick={() => setShowCalc(c => !c)} 
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            Calculator
          </button>
        </div>
      </header>


      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden px-8 md:px-16 xl:px-24 2xl:px-32 py-4 gap-4 md:gap-6 bg-gray-100" style={{ paddingLeft: '4rem', paddingRight: '4rem' }}>
        
        {/* Question Area */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
          
          {/* Watermarks - 4 on a page */}
          <div className="absolute inset-0 pointer-events-none flex flex-wrap justify-around items-center overflow-hidden z-0 opacity-[0.03]">
            <div className="w-1/2 h-1/2 flex items-center justify-center">
              <div className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 -rotate-45 whitespace-nowrap select-none tracking-widest">Aman Kumar</div>
            </div>
            <div className="w-1/2 h-1/2 flex items-center justify-center">
              <div className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 -rotate-45 whitespace-nowrap select-none tracking-widest">Aman Kumar</div>
            </div>
            <div className="w-1/2 h-1/2 flex items-center justify-center">
              <div className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 -rotate-45 whitespace-nowrap select-none tracking-widest">Aman Kumar</div>
            </div>
            <div className="w-1/2 h-1/2 flex items-center justify-center">
              <div className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 -rotate-45 whitespace-nowrap select-none tracking-widest">Aman Kumar</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 relative z-10" style={{ padding: '2rem' }}>
            <div className="max-w-4xl mx-auto">
              
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    Question {currentQ}
                  </h2>
                  <div className="hidden sm:flex items-center gap-2 text-sm font-semibold bg-gray-50 px-3 py-1 rounded-md border border-gray-200">
                    <span className="text-green-600" title="Marks for correct answer">+4</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-red-500" title="Negative marks for wrong answer">-1</span>
                  </div>
                </div>
                {currentQuestion?.subject && (
                  <span className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded-md font-bold uppercase tracking-wide border border-gray-200">
                    {currentQuestion.subject}
                  </span>
                )}
              </div>

              <div className="mb-8 text-lg text-gray-800 leading-relaxed font-medium">
                {currentQuestion?.questionText || 'Question not found'}
              </div>

              {currentQuestion?.imageURL && (
                <div className="mb-8 p-4 border border-gray-200 rounded-lg inline-block">
                  <img src={currentQuestion.imageURL} alt="Question figure" className="max-w-full h-auto max-h-80" />
                </div>
              )}

              <div className="flex flex-col gap-4 max-w-3xl mb-8">
                {currentQuestion && ['A', 'B', 'C', 'D'].map((opt, idx) => {
                  const isSelected = responses[currentQ]?.selected === opt;
                  return (
                    <label key={opt} className={`option ${isSelected ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={`q${currentQ}`}
                        checked={isSelected}
                        onChange={() => selectOption(opt)}
                        className="option-radio"
                      />
                      <span className="flex-1">
                        <strong className="mr-3">{String.fromCharCode(65 + idx)}</strong>
                        {currentQuestion.options[opt as keyof typeof currentQuestion.options]}
                      </span>
                      <div className="check-icon">✓</div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 shrink-0" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
            <div className="max-w-4xl mx-auto flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-3">
                 <button onClick={handleMarkReviewNext} className="nav-btn bg-[#6f42c1] text-white">Mark for Review & Next</button>
                 <button onClick={handleClear} className="nav-btn bg-[#ffc107] text-gray-900">Clear Response</button>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveMarkReview} className={`nav-btn ${responses[currentQ]?.selected ? 'bg-[#28a745] text-white' : 'bg-gray-200 text-gray-400'}`}>Save & Mark for Review</button>
                <button onClick={handleSaveNext} className={`nav-btn ${responses[currentQ]?.selected ? 'bg-[#007bff] text-white' : 'bg-gray-200 text-gray-400'}`}>Save & Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Question Palette */}
        <div className="w-[320px] bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col shrink-0 overflow-hidden">
          
          <div className="bg-palette-gradient p-4 text-white" style={{ padding: '1rem' }}>
             <h4 className="font-bold text-lg mb-1">Question Palette</h4>
          </div>

          <div className="p-4 border-b border-gray-200 bg-gray-50" style={{ padding: '1rem' }}>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm font-medium">
              <div className="flex items-center gap-2">
                <span className="palette-btn not-visited w-8 h-8 text-xs">{notVisitedCount}</span>
                <span className="text-gray-700">Not Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="palette-btn not-answered w-8 h-8 text-xs">{notAnsweredCount}</span>
                <span className="text-gray-700">Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="palette-btn answered w-8 h-8 text-xs">{answeredCount}</span>
                <span className="text-gray-700">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="palette-btn marked w-8 h-8 text-xs">{markedCount}</span>
                <span className="text-gray-700">Marked</span>
              </div>
            </div>
            
            <div className="flex items-start gap-2 mt-4 pt-4 border-t border-gray-200">
              <div className="palette-btn answered-marked w-8 h-8 shrink-0 text-xs">
                {Object.values(responses).filter(r => r.status === 'answered_and_marked').length}
              </div>
              <span className="text-gray-600 text-xs leading-tight">Answered & Marked for Review (will be considered for evaluation)</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4" style={{ padding: '1rem' }}>
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: totalQ }, (_, i) => i + 1).map(qNum => (
                <button
                  key={qNum}
                  onClick={() => goToQuestion(qNum)}
                  className={`palette-btn ${getStatusClass(getStatus(qNum))} ${currentQ === qNum ? 'active' : ''}`}
                >
                  {qNum}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button 
              onClick={() => setShowSubmitModal(true)} 
              className="w-full bg-[#1e3c72] hover:bg-[#2a5298] text-white py-3 rounded-lg font-bold uppercase transition-colors"
            >
              Submit Test
            </button>
          </div>
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
                <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-200">{answeredCount}</span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span className="text-gray-700 flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#dc3545]"></span> Not Answered</span>
                <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-200">{notAnsweredCount}</span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span className="text-gray-700 flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#6f42c1]"></span> Marked for Review</span>
                <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-200">{markedCount}</span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span className="text-gray-700 flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#6c757d]"></span> Not Visited</span>
                <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-200">{notVisitedCount}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSubmitModal(false)} 
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={() => { setSubmitted(true); setShowSubmitModal(false); }} 
                className="flex-1 px-4 py-3 bg-[#1e3c72] text-white rounded-lg font-bold hover:bg-[#2a5298] transition-colors"
              >
                Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Virtual Calculator */}
      {showCalc && <VirtualCalculator onClose={() => setShowCalc(false)} />}
    </div>
  );
}
