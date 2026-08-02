"use client";

import React, { useState } from 'react';

export default function VirtualCalculator({ onClose }: { onClose: () => void }) {
  const [expr, setExpr] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 120 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    (e.target as HTMLDivElement).releasePointerCapture(e.pointerId);
  };

  const append = (val: string) => setExpr(prev => prev + val);
  const clear = () => setExpr('');
  const backspace = () => setExpr(prev => prev.slice(0, -1));
  const evaluate = () => {
    try {
      // Safe eval equivalent for basic math (avoids calling arbitrary functions)
      // We strip out any letters to be extra safe
      const safeExpr = expr.replace(/[^-()\d/*+.]/g, '');
      const result = new Function('return ' + safeExpr)();
      if (Number.isFinite(result)) {
        setExpr(String(Math.round(result * 10000) / 10000)); // round to 4 decimal places
      } else {
        setExpr('Error');
      }
    } catch {
      setExpr('Error');
    }
  };

  return (
    <div 
      className="fixed z-[100] bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl flex flex-col w-72 select-none touch-none overflow-hidden"
      style={{ left: position.x, top: position.y }}
    >
      {/* Draggable Header */}
      <div 
        className="bg-slate-800/80 text-white px-4 py-3 border-b border-slate-700 flex justify-between items-center cursor-move"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span className="font-semibold text-sm tracking-wide pointer-events-none flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
          Calculator
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-white pointer-events-auto transition-colors rounded-full p-1 hover:bg-slate-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <div className="p-4">
        {/* Display Screen */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl mb-4 p-3 text-right text-2xl font-mono min-h-[60px] flex items-center justify-end break-all overflow-hidden shadow-inner text-emerald-400 tracking-wider">
          {expr || '0'}
        </div>
        
        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2.5">
          <button onClick={clear} className="col-span-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2.5 rounded-lg font-bold transition-colors">AC</button>
          <button onClick={backspace} className="col-span-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 py-2.5 rounded-lg font-bold transition-colors">DEL</button>
          
          <button onClick={() => append('7')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg font-semibold text-lg transition-colors">7</button>
          <button onClick={() => append('8')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg font-semibold text-lg transition-colors">8</button>
          <button onClick={() => append('9')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg font-semibold text-lg transition-colors">9</button>
          <button onClick={() => append('/')} className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 py-2.5 rounded-lg font-bold text-lg transition-colors">&divide;</button>
          
          <button onClick={() => append('4')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg font-semibold text-lg transition-colors">4</button>
          <button onClick={() => append('5')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg font-semibold text-lg transition-colors">5</button>
          <button onClick={() => append('6')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg font-semibold text-lg transition-colors">6</button>
          <button onClick={() => append('*')} className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 py-2.5 rounded-lg font-bold text-lg transition-colors">&times;</button>
          
          <button onClick={() => append('1')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg font-semibold text-lg transition-colors">1</button>
          <button onClick={() => append('2')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg font-semibold text-lg transition-colors">2</button>
          <button onClick={() => append('3')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg font-semibold text-lg transition-colors">3</button>
          <button onClick={() => append('-')} className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 py-2.5 rounded-lg font-bold text-lg transition-colors">&minus;</button>
          
          <button onClick={() => append('0')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg font-semibold text-lg transition-colors">0</button>
          <button onClick={() => append('.')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg font-bold text-lg transition-colors">.</button>
          <button onClick={evaluate} className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-bold text-xl shadow-lg shadow-indigo-900/50 transition-colors">=</button>
          <button onClick={() => append('+')} className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 py-2.5 rounded-lg font-bold text-lg transition-colors">+</button>
        </div>
      </div>
    </div>
  );
}
