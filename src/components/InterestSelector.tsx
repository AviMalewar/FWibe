import React from 'react';

interface InterestSelectorProps {
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
}

export default function InterestSelector({ options, selected, onToggle }: InterestSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            onClick={() => onToggle(option)}
            className={`p-4 rounded-2xl border transition-all text-xs font-black tracking-widest uppercase ${
              isSelected 
                ? 'bg-gradient-to-br from-accent-blue to-accent-purple border-transparent text-white shadow-lg shadow-accent-blue/20 scale-105' 
                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white hover:bg-white/10'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
