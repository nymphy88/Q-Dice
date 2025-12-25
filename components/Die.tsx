
import React from 'react';

interface DieProps {
  value: number;
  color: 'cyan' | 'pink';
  rolling?: boolean;
}

const Die: React.FC<DieProps> = ({ value, color, rolling }) => {
  const dotClasses = {
    cyan: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]",
    pink: "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]"
  };

  const getDots = (val: number) => {
    switch (val) {
      case 1: return <div className="col-start-2 row-start-2 flex items-center justify-center"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>;
      case 2: return (
        <>
          <div className="col-start-1 row-start-1"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-3 row-start-3"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
        </>
      );
      case 3: return (
        <>
          <div className="col-start-1 row-start-1"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-2 row-start-2"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-3 row-start-3"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
        </>
      );
      case 4: return (
        <>
          <div className="col-start-1 row-start-1"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-3 row-start-1"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-1 row-start-3"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-3 row-start-3"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
        </>
      );
      case 5: return (
        <>
          <div className="col-start-1 row-start-1"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-3 row-start-1"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-2 row-start-2"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-1 row-start-3"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-3 row-start-3"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
        </>
      );
      case 6: return (
        <>
          <div className="col-start-1 row-start-1"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-3 row-start-1"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-1 row-start-2"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-3 row-start-2"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-1 row-start-3"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
          <div className="col-start-3 row-start-3"><div className={`w-3 h-3 rounded-full ${dotClasses[color]}`} /></div>
        </>
      );
      default: return null;
    }
  };

  const containerBase = color === 'cyan' 
    ? "bg-slate-900 border-2 border-cyan-400 glow-box-cyan" 
    : "bg-slate-900 border-2 border-pink-500 glow-box-pink";

  return (
    <div className={`relative w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300 transform ${rolling ? 'animate-bounce' : ''} ${containerBase}`}>
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-2 place-items-center">
        {getDots(value)}
      </div>
    </div>
  );
};

export default Die;
