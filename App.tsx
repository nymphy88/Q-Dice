
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, GameState, DieResult } from './types';
import { getDealerCommentary } from './services/gemini';
import Die from './components/Die';

// --- Sci-Fi Electronic Audio Engine (Synthesized) ---
const createAudioEngine = () => {
  if (typeof window === 'undefined') return null;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const playSound = (freq: number, type: OscillatorType, duration: number, volume = 0.1, fadeOut = true) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const sciFiPulse = (freq: number, vol = 0.05, decay = 0.2) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + decay);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(t + decay);
  };

  return {
    roll: () => {
      for(let i = 0; i < 3; i++) {
        setTimeout(() => sciFiPulse(150 + (i * 40), 0.08, 0.15), i * 40);
      }
    },
    win: () => {
      const notes = [440, 554.37, 659.25, 880]; 
      notes.forEach((f, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }, i * 80);
      });
    },
    lose: () => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.linearRampToValueAtTime(40, t + 0.5);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 0.5);
    },
    gamble: () => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 1.2);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.6);
      gain.gain.linearRampToValueAtTime(0, t + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 1.2);
    },
    click: () => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.04);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 0.04);
    }
  };
};

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    phase: GamePhase.BETTING,
    playerDice: [],
    dealerDice: [],
    balance: 1000,
    currentBet: 100,
    survivorBonus: 0,
    message: "CONNECTING...",
    dealerThinking: false,
    isQuantumGambleActive: false,
    isCounterActive: false
  });

  const [dealerWords, setDealerWords] = useState<string>("Enter the grid. Bet your life.");
  const [isRolling, setIsRolling] = useState(false);
  const audioRef = useRef<ReturnType<typeof createAudioEngine>>(null);

  useEffect(() => {
    // @ts-ignore
    audioRef.current = createAudioEngine();
  }, []);

  const rollDie = (): DieResult => (Math.floor(Math.random() * 6) + 1) as DieResult;
  const getScore = (dice: DieResult[]) => dice.reduce((acc, curr) => acc + curr, 0);

  // Optimized commentary trigger to reduce API usage and handle quota
  const triggerCommentary = async (pDice: DieResult[], dDice: DieResult[], phase: GamePhase) => {
    const pScore = getScore(pDice);
    const dScore = getScore(dDice);
    const data = await getDealerCommentary(pScore, dScore, phase, pScore > 21, state.survivorBonus);
    setDealerWords(data.text);
  };

  const startGame = () => {
    if (state.balance < state.currentBet) return;
    audioRef.current?.click();
    
    const p = [rollDie(), rollDie()];
    const d = [rollDie()];
    
    setState(prev => ({
      ...prev,
      phase: GamePhase.PLAYER_TURN,
      playerDice: p,
      dealerDice: d,
      balance: prev.balance - prev.currentBet,
      survivorBonus: 0,
      message: "SYSTEM ONLINE.",
      isQuantumGambleActive: false,
      isCounterActive: false
    }));
    audioRef.current?.roll();
    triggerCommentary(p, d, GamePhase.PLAYER_TURN);
  };

  const playerHit = () => {
    if (isRolling) return;
    setIsRolling(true);
    audioRef.current?.roll();
    
    setTimeout(() => {
      setIsRolling(false);
      const nextDice = [...state.playerDice, rollDie(), rollDie()];
      const score = getScore(nextDice);

      if (score > 21) {
        audioRef.current?.lose();
        setState(prev => ({
          ...prev,
          playerDice: nextDice,
          phase: GamePhase.RESULT,
          message: "OVERLOAD: BUST!"
        }));
        triggerCommentary(nextDice, state.dealerDice, GamePhase.RESULT);
      } else {
        setState(prev => ({
          ...prev,
          playerDice: nextDice,
          survivorBonus: prev.survivorBonus + 1,
          message: `SYNC: ${score} (+2)`
        }));
        // Reduced API usage: Only trigger hit commentary on first hit or if score is high
        if (state.survivorBonus === 0 || score > 18) {
          triggerCommentary(nextDice, state.dealerDice, GamePhase.PLAYER_TURN);
        }
      }
    }, 400);
  };

  const playerStand = () => {
    audioRef.current?.click();
    setState(prev => ({ ...prev, phase: GamePhase.DEALER_TURN, message: "HOST TURN..." }));
    dealerSequence();
  };

  const playerCounter = () => {
    audioRef.current?.gamble();
    setState(prev => ({ 
      ...prev, 
      isCounterActive: true, 
      phase: GamePhase.DEALER_TURN, 
      message: "COUNTER ARMED." 
    }));
    dealerSequence();
  };

  const dealerSequence = async () => {
    let dDice = [...state.dealerDice];
    let hitCount = 0;
    
    const step = async () => {
      if (getScore(dDice) < 17) {
        setState(prev => ({ ...prev, dealerThinking: true }));
        await new Promise(r => setTimeout(r, 800));
        audioRef.current?.roll();
        
        if (hitCount === 0) {
          dDice.push(rollDie());
        } else {
          dDice.push(rollDie());
          dDice.push(rollDie());
        }
        hitCount++;
        
        setState(prev => ({ ...prev, dealerDice: [...dDice] }));
        step();
      } else {
        setState(prev => ({ ...prev, dealerThinking: false }));
        finalizeRound(dDice);
      }
    };
    step();
  };

  const finalizeRound = (finalDealer: DieResult[]) => {
    const pScore = getScore(state.playerDice);
    const dScore = getScore(finalDealer);

    if (dScore > 21) {
      audioRef.current?.win();
      const win = (state.currentBet * 2) + (state.survivorBonus * 20);
      setState(prev => ({
        ...prev,
        phase: GamePhase.RESULT,
        balance: prev.balance + win,
        message: `HOST BUST! +${win}CR`
      }));
    } else if (pScore > dScore) {
      audioRef.current?.win();
      const win = (state.currentBet * 2) + (state.survivorBonus * 20);
      setState(prev => ({
        ...prev,
        phase: GamePhase.RESULT,
        balance: prev.balance + win,
        message: `WIN! +${win}CR`
      }));
    } else if (dScore > pScore) {
      audioRef.current?.gamble();
      if (state.isCounterActive) {
        setState(prev => ({
          ...prev,
          dealerDice: finalDealer,
          phase: GamePhase.QUANTUM_ROLLING,
          isQuantumGambleActive: true,
          message: "COUNTER ACTIVATED."
        }));
      } else {
        setState(prev => ({
          ...prev,
          dealerDice: finalDealer,
          phase: GamePhase.QUANTUM_CHOICE,
          isQuantumGambleActive: true,
          message: "VOID TRIGGERED."
        }));
      }
    } else {
      audioRef.current?.click();
      setState(prev => ({
        ...prev,
        phase: GamePhase.RESULT,
        balance: prev.balance + prev.currentBet,
        message: "PUSH."
      }));
    }
    triggerCommentary(state.playerDice, finalDealer, GamePhase.RESULT);
  };

  const handleOpenKeySelection = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  // Missing function added to fix reference error
  const initiateManualRoll = () => {
    audioRef.current?.click();
    setState(prev => ({
      ...prev,
      phase: GamePhase.QUANTUM_ROLLING,
      message: "BREACHING VOID..."
    }));
  };

  const executeManualGambleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    audioRef.current?.roll();

    setTimeout(() => {
      setIsRolling(false);
      const bonusDie = rollDie();
      const finalP = [...state.playerDice, bonusDie];
      const finalPScore = getScore(finalP);
      const dScore = getScore(state.dealerDice);
      
      let msg = "";
      let payout = 0;
      let penalty = 0;

      if (finalPScore === 21) {
        audioRef.current?.win();
        payout = state.currentBet * 3;
        msg = `SINGULARITY! +${payout}CR`;
      } else if (finalPScore > dScore && finalPScore < 21) {
        audioRef.current?.win();
        payout = state.currentBet * 2;
        msg = `RECOVERED! +${payout}CR`;
      } else {
        audioRef.current?.lose();
        penalty = Math.floor(state.currentBet * 0.5);
        msg = `FAILED! -${state.currentBet + penalty}CR`;
      }

      setState(prev => ({
        ...prev,
        playerDice: finalP,
        phase: GamePhase.RESULT,
        balance: prev.balance + payout - penalty,
        message: msg,
        isQuantumGambleActive: false,
        isCounterActive: false
      }));
      triggerCommentary(finalP, state.dealerDice, GamePhase.RESULT);
    }, 1200);
  };

  const restartRound = () => {
    audioRef.current?.click();
    setState(prev => ({
      ...prev,
      phase: GamePhase.BETTING,
      playerDice: [],
      dealerDice: [],
      isCounterActive: false,
      message: "READY."
    }));
  };

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-between p-2 md:p-8 bg-[#050505] text-white font-rajdhani overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />
      
      {/* Header */}
      <div className="w-full flex justify-between items-end z-10 border-b border-cyan-500/20 pb-2 pt-1 md:pb-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-1 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${state.isCounterActive ? 'bg-orange-500 shadow-[0_0_5px_#ff8c00]' : 'bg-pink-500 shadow-[0_0_5px_#ff00ff]'}`} />
            <span className={`${state.isCounterActive ? 'text-orange-500' : 'text-pink-500'} text-[8px] md:text-[10px] tracking-[0.3em] font-mono uppercase italic`}>
              {state.isCounterActive ? 'COUNTER ARMED' : 'LINK ACTIVE'}
            </span>
          </div>
          <h1 className="text-2xl md:text-6xl font-orbitron font-black italic tracking-tighter leading-none">
            <span className="neon-text-pink">QUANTUM</span> <span className="text-cyan-400 neon-text-cyan">G</span>
          </h1>
        </div>
        <div className="text-right flex flex-col items-end">
          <button 
            onClick={handleOpenKeySelection}
            className="text-cyan-500/50 hover:text-cyan-500 text-[8px] md:text-[10px] font-mono tracking-widest uppercase mb-1 transition-colors"
          >
            [SYSTEM CREDITS]
          </button>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl md:text-5xl font-orbitron font-bold neon-text-cyan">{state.balance}</span>
            <span className="text-cyan-400 font-bold text-[10px] md:text-sm">CR</span>
          </div>
        </div>
      </div>

      {/* Arena */}
      <div className="flex-1 w-full flex flex-col justify-around items-center z-10 py-2">
        <div className="w-full flex flex-col items-center gap-2 md:gap-4">
          <div className="text-pink-500/50 font-mono text-[8px] md:text-[10px] tracking-[0.4em] uppercase">HOST NODE</div>
          <div className="flex gap-2 md:gap-4 min-h-[50px] md:min-h-[80px]">
            {state.dealerDice.map((v, i) => <Die key={i} value={v} color="pink" />)}
            {state.dealerThinking && (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl border border-pink-500/20 flex items-center justify-center animate-pulse">
                <div className="w-3 h-3 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="text-pink-500 font-orbitron text-lg md:text-2xl tracking-[0.2em] uppercase">
            PWR: {getScore(state.dealerDice)}
          </div>
        </div>

        <div className="w-full max-w-sm px-2 md:max-w-xl relative">
          <div className="bg-slate-950/40 border-y border-cyan-500/20 p-2 md:p-4 backdrop-blur-sm">
            <p className="text-cyan-100 font-rajdhani text-sm md:text-xl leading-tight italic text-center">
              "{dealerWords}"
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-2 md:gap-6">
          <div className="font-orbitron text-cyan-400 text-lg md:text-3xl tracking-[0.1em] flex items-center gap-2 md:gap-6">
            SYNC: {getScore(state.playerDice)}
            {state.survivorBonus > 0 && (
              <div className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-[8px] font-mono text-cyan-300 animate-pulse uppercase">
                x{state.survivorBonus}
              </div>
            )}
          </div>
          <div className="flex gap-2 md:gap-4 min-h-[50px] md:min-h-[80px] flex-wrap justify-center">
            {state.playerDice.map((v, i) => (
              <Die key={i} value={v} color="cyan" rolling={isRolling && (i >= state.playerDice.length - 2)} />
            ))}
          </div>
          <div className="text-cyan-500/50 font-mono text-[8px] md:text-[10px] tracking-[0.4em] uppercase">USER DATA</div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full max-w-4xl bg-[#080808] border-t border-cyan-500/20 p-4 md:p-8 z-20 rounded-t-3xl shadow-[0_-15px_30px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col items-center gap-4 md:gap-8">
          <p className="text-white text-base md:text-2xl font-orbitron font-bold uppercase tracking-widest text-center animate-neon-pulse">
            {state.message}
          </p>

          <div className="w-full flex flex-col gap-3 md:gap-6 items-center">
            {state.phase === GamePhase.BETTING && (
              <>
                <div className="flex gap-2 md:gap-4">
                  {[10, 50, 100, 500].map(amt => (
                    <button
                      key={amt}
                      onClick={() => { audioRef.current?.click(); setState(prev => ({ ...prev, currentBet: amt })); }}
                      className={`w-10 h-10 md:w-16 md:h-16 rounded border-2 font-orbitron text-[10px] md:text-sm transition-all ${
                        state.currentBet === amt 
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_#00ffff]' 
                          : 'bg-transparent text-cyan-500 border-cyan-500/30'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
                <button
                  onClick={startGame}
                  className="w-full max-w-xs py-3 md:py-5 bg-cyan-500 text-black font-orbitron font-black text-lg md:text-2xl rounded shadow-[0_0_15px_rgba(0,255,255,0.3)] uppercase"
                >
                  START
                </button>
              </>
            )}

            {state.phase === GamePhase.PLAYER_TURN && (
              <div className="w-full flex flex-col gap-2 max-w-md">
                <div className="flex gap-2 w-full">
                  <button
                    onClick={playerHit}
                    disabled={isRolling}
                    className="flex-1 py-3 md:py-6 border-2 border-cyan-500 text-cyan-400 font-orbitron font-bold text-sm md:text-xl rounded active:bg-cyan-500 active:text-black uppercase"
                  >
                    HIT [+2]
                  </button>
                  <button
                    onClick={playerStand}
                    className="flex-1 py-3 md:py-6 border-2 border-pink-500 text-pink-400 font-orbitron font-bold text-sm md:text-xl rounded active:bg-pink-500 active:text-black uppercase"
                  >
                    STAND
                  </button>
                </div>
                {getScore(state.playerDice) >= 15 && (
                  <button
                    onClick={playerCounter}
                    className="w-full py-3 md:py-6 bg-gradient-to-r from-orange-600 to-red-600 text-white font-orbitron font-black text-sm md:text-2xl rounded animate-pulse uppercase tracking-widest shadow-lg"
                  >
                    COUNTER [15+]
                  </button>
                )}
              </div>
            )}

            {state.phase === GamePhase.QUANTUM_CHOICE && (
              <div className="flex flex-col gap-2 w-full max-w-md">
                <button
                  onClick={initiateManualRoll}
                  className="w-full py-3 md:py-6 bg-pink-600 text-white font-orbitron font-black text-lg md:text-2xl rounded shadow-[0_0_15px_#ff00ff] uppercase"
                >
                  GAMBLE
                </button>
                <button
                  onClick={() => {
                    audioRef.current?.click();
                    audioRef.current?.lose();
                    setState(prev => ({
                      ...prev,
                      phase: GamePhase.RESULT,
                      message: "SURRENDERED.",
                      isQuantumGambleActive: false,
                      isCounterActive: false
                    }));
                  }}
                  className="w-full py-2 md:py-4 border border-slate-700 text-slate-500 font-orbitron font-bold uppercase text-[10px]"
                >
                  SURRENDER
                </button>
              </div>
            )}

            {state.phase === GamePhase.QUANTUM_ROLLING && (
              <div className="flex flex-col items-center gap-4 py-2">
                <button
                  onClick={executeManualGambleRoll}
                  disabled={isRolling}
                  className="w-24 h-24 md:w-32 md:h-32 bg-black border-4 border-pink-500 rounded-full flex items-center justify-center shadow-[0_0_30px_#ff00ff] active:scale-90 transition-transform group"
                >
                  <span className="font-orbitron font-black text-xl md:text-3xl text-pink-500 group-hover:scale-110">ROLL</span>
                </button>
                <span className="text-pink-500/60 font-mono text-[8px] md:text-[10px] uppercase tracking-widest animate-bounce">VOID DIE</span>
              </div>
            )}

            {state.phase === GamePhase.RESULT && (
              <button
                onClick={restartRound}
                className="w-full max-w-xs py-3 md:py-5 bg-white text-black font-orbitron font-black text-lg md:text-2xl rounded shadow-[0_0_15px_rgba(255,255,255,0.3)] uppercase"
              >
                NEXT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
