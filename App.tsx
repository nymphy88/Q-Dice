
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, GameState, DieResult } from './types';
import { getDealerCommentary } from './services/gemini';
import Die from './components/Die';

// --- Cyberpunk Audio Engine (Synthesized) ---
const createAudioEngine = () => {
  if (typeof window === 'undefined') return null;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const playSound = (freq: number, type: OscillatorType, duration: number, volume = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  return {
    roll: () => {
      playSound(150, 'square', 0.1, 0.05);
      setTimeout(() => playSound(100, 'square', 0.1, 0.05), 50);
    },
    win: () => {
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        setTimeout(() => playSound(f, 'sine', 0.4, 0.1), i * 100);
      });
    },
    lose: () => {
      playSound(100, 'sawtooth', 0.5, 0.1);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    },
    gamble: () => {
      playSound(50, 'triangle', 1.0, 0.2);
    },
    click: () => playSound(800, 'sine', 0.05, 0.05)
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
    message: "INITIALIZING QUANTUM LINK...",
    dealerThinking: false,
    isQuantumGambleActive: false
  });

  const [dealerWords, setDealerWords] = useState<string>("Welcome to the Neo-Void. Place your stakes.");
  const [isRolling, setIsRolling] = useState(false);
  const audioRef = useRef<ReturnType<typeof createAudioEngine>>(null);

  useEffect(() => {
    // @ts-ignore
    audioRef.current = createAudioEngine();
  }, []);

  const rollDie = (): DieResult => (Math.floor(Math.random() * 6) + 1) as DieResult;
  const getScore = (dice: DieResult[]) => dice.reduce((acc, curr) => acc + curr, 0);

  const updateCommentary = useCallback(async (phase: GamePhase) => {
    const pScore = getScore(state.playerDice);
    const dScore = getScore(state.dealerDice);
    const data = await getDealerCommentary(pScore, dScore, phase, pScore > 21, state.survivorBonus);
    setDealerWords(data.text);
  }, [state.playerDice, state.dealerDice, state.survivorBonus]);

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
      message: "SYSTEM ONLINE. FIRST STAGE ACTIVE.",
      isQuantumGambleActive: false
    }));
    audioRef.current?.roll();
    updateCommentary(GamePhase.PLAYER_TURN);
  };

  const playerHit = () => {
    if (isRolling) return;
    setIsRolling(true);
    audioRef.current?.roll();
    
    setTimeout(() => {
      setIsRolling(false);
      const next = rollDie();
      const nextDice = [...state.playerDice, next];
      const score = getScore(nextDice);

      if (score > 21) {
        audioRef.current?.lose();
        setState(prev => ({
          ...prev,
          playerDice: nextDice,
          phase: GamePhase.RESULT,
          message: "NEURAL OVERLOAD: BUST!"
        }));
      } else {
        setState(prev => ({
          ...prev,
          playerDice: nextDice,
          survivorBonus: prev.survivorBonus + 1,
          message: `SYNCED: ${score}`
        }));
      }
    }, 400);
  };

  const playerStand = () => {
    audioRef.current?.click();
    setState(prev => ({ ...prev, phase: GamePhase.DEALER_TURN, message: "DEALER CALCULATING..." }));
    dealerSequence();
  };

  const dealerSequence = async () => {
    let dDice = [...state.dealerDice];
    
    const step = async () => {
      if (getScore(dDice) < 17) {
        setState(prev => ({ ...prev, dealerThinking: true }));
        await new Promise(r => setTimeout(r, 700));
        audioRef.current?.roll();
        dDice.push(rollDie());
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

    if (dScore > 21 || pScore > dScore) {
      audioRef.current?.win();
      const bonus = state.survivorBonus * 20;
      const win = (state.currentBet * 2) + bonus;
      setState(prev => ({
        ...prev,
        phase: GamePhase.RESULT,
        balance: prev.balance + win,
        message: `VICTORY: ${win}CR SECURED. SURVIVOR BONUS: +${bonus}`
      }));
    } else if (dScore > pScore) {
      audioRef.current?.gamble();
      setState(prev => ({
        ...prev,
        dealerDice: finalDealer,
        phase: GamePhase.QUANTUM_CHOICE,
        isQuantumGambleActive: true,
        message: "ANOMALY: DEALER DOMINANCE. ACTIVATE RECOVERY?"
      }));
    } else {
      audioRef.current?.click();
      setState(prev => ({
        ...prev,
        phase: GamePhase.RESULT,
        balance: prev.balance + prev.currentBet,
        message: "STALEMATE. CREDITS RETURNED."
      }));
    }
    updateCommentary(GamePhase.RESULT);
  };

  const executeQuantumGamble = () => {
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

      // Logic:
      // total == 21: Win 200% profit (3x total)
      // total > dealer and < 21: Win 100% profit (2x total)
      // total <= dealer or > 21: Lose 150% of original bet
      if (finalPScore === 21) {
        audioRef.current?.win();
        payout = state.currentBet * 3;
        msg = `QUANTUM SINGULARITY! 21 REACHED. +${payout}CR.`;
      } else if (finalPScore > dScore && finalPScore < 21) {
        audioRef.current?.win();
        payout = state.currentBet * 2;
        msg = `RECOVERY SUCCESSFUL. ${finalPScore} > ${dScore}. +${payout}CR.`;
      } else {
        audioRef.current?.lose();
        penalty = Math.floor(state.currentBet * 0.5); // 1.5x total loss (1x already deducted at start)
        msg = `PROTOCOL FAILED: ${finalPScore}. TOTAL LOSS: ${state.currentBet + penalty}CR.`;
      }

      setState(prev => ({
        ...prev,
        playerDice: finalP,
        phase: GamePhase.RESULT,
        balance: prev.balance + payout - penalty,
        message: msg,
        isQuantumGambleActive: false
      }));
      updateCommentary(GamePhase.RESULT);
    }, 1000);
  };

  const declineGamble = () => {
    audioRef.current?.lose();
    setState(prev => ({
      ...prev,
      phase: GamePhase.RESULT,
      message: "SURRENDER CONFIRMED. ASSETS PURGED.",
      isQuantumGambleActive: false
    }));
    updateCommentary(GamePhase.RESULT);
  };

  const restartRound = () => {
    audioRef.current?.click();
    setState(prev => ({
      ...prev,
      phase: GamePhase.BETTING,
      playerDice: [],
      dealerDice: [],
      message: "AWAITING NEW BIOMETRIC INPUT."
    }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 md:p-8 bg-[#050505] relative overflow-hidden text-white font-rajdhani">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

      {/* Header HUD */}
      <div className="w-full max-w-6xl flex justify-between items-start z-10 border-b border-cyan-500/20 pb-6 pt-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-[0_0_8px_#ff00ff]" />
            <span className="text-pink-500 text-[10px] tracking-[0.5em] font-mono uppercase">Neural Link: Active</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-orbitron font-black italic tracking-tighter leading-none">
            <span className="neon-text-pink">QUANTUM</span> <span className="text-cyan-400 neon-text-cyan">GAMBLE</span>
          </h1>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="text-cyan-500 text-[10px] font-mono tracking-[0.3em] uppercase mb-1 opacity-70">Credit Reserves</div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-orbitron font-bold neon-text-cyan">{state.balance}</span>
            <span className="text-cyan-400 font-bold text-sm tracking-widest">CR</span>
          </div>
        </div>
      </div>

      {/* Arena */}
      <div className="flex-1 w-full max-w-5xl flex flex-col justify-center items-center gap-14 z-10">
        
        {/* Dealer Node */}
        <div className="w-full flex flex-col items-center gap-6">
          <div className="text-pink-500/50 font-mono text-[10px] tracking-[0.4em] uppercase flex items-center gap-4">
            <div className="w-16 h-[1px] bg-pink-500/30" />
            Host Subsystem [NEON-X]
            <div className="w-16 h-[1px] bg-pink-500/30" />
          </div>
          <div className="flex gap-8 min-h-[80px] perspective-1000">
            {state.dealerDice.map((v, i) => <Die key={i} value={v} color="pink" />)}
            {state.dealerThinking && (
              <div className="w-16 h-16 rounded-xl border border-pink-500/40 flex items-center justify-center animate-pulse bg-pink-500/5 shadow-[0_0_15px_rgba(255,0,255,0.1)]">
                <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="text-pink-500 font-orbitron text-2xl tracking-[0.3em] uppercase">
            Power: {getScore(state.dealerDice)}
          </div>
        </div>

        {/* Neural Commentary */}
        <div className="w-full max-w-2xl relative">
          <div className="bg-slate-950/60 border-y border-cyan-500/20 p-6 backdrop-blur-md shadow-2xl relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500 shadow-[0_0_15px_#00ffff]" />
            <div className="text-cyan-500 text-[9px] font-mono mb-2 tracking-[0.2em] flex justify-between opacity-60">
              <span>AI_INTERCEPT_STREAM</span>
              <span>PARITY_CHECK_OK</span>
            </div>
            <p className="text-cyan-100 font-rajdhani text-2xl leading-tight italic tracking-wide">
              "{dealerWords}"
            </p>
          </div>
        </div>

        {/* Player Link */}
        <div className="w-full flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="font-orbitron text-cyan-400 text-3xl tracking-[0.1em] flex items-center gap-6">
              SYNC STATUS: {getScore(state.playerDice)}
              {state.survivorBonus > 0 && (
                <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-sm text-xs font-mono text-cyan-300 animate-pulse uppercase tracking-tighter">
                  Survivor x{state.survivorBonus}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-8 min-h-[80px] flex-wrap justify-center">
            {state.playerDice.map((v, i) => (
              <Die key={i} value={v} color="cyan" rolling={isRolling && i === state.playerDice.length - 1} />
            ))}
          </div>
          <div className="text-cyan-500/50 font-mono text-[10px] tracking-[0.4em] uppercase flex items-center gap-4">
            <div className="w-16 h-[1px] bg-cyan-500/30" />
            Biological Data Stream
            <div className="w-16 h-[1px] bg-cyan-500/30" />
          </div>
        </div>
      </div>

      {/* Control Surface */}
      <div className="w-full max-w-4xl bg-[#0a0a0a] border-t border-cyan-500/30 p-8 z-20 rounded-t-[4rem] shadow-[0_-40px_80px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col items-center gap-10">
          <div className="text-center w-full px-4">
            <p className="text-white text-3xl font-orbitron font-bold uppercase tracking-[0.25em] animate-neon-pulse drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              {state.message}
            </p>
          </div>

          <div className="w-full flex justify-center">
            {state.phase === GamePhase.BETTING && (
              <div className="flex flex-col items-center gap-10 w-full">
                <div className="flex flex-wrap justify-center gap-6">
                  {[10, 50, 100, 500].map(amt => (
                    <button
                      key={amt}
                      onClick={() => { audioRef.current?.click(); setState(prev => ({ ...prev, currentBet: amt })); }}
                      className={`w-20 h-20 rounded-sm border-2 font-orbitron text-lg transition-all flex items-center justify-center relative overflow-hidden group ${
                        state.currentBet === amt 
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_25px_#00ffff]' 
                          : 'bg-transparent text-cyan-500 border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/5'
                      }`}
                    >
                      <span className="z-10">{amt}</span>
                      <div className={`absolute bottom-0 left-0 w-full h-1 bg-cyan-300 opacity-50 ${state.currentBet === amt ? 'block' : 'hidden'}`} />
                    </button>
                  ))}
                </div>
                <button
                  onClick={startGame}
                  className="w-full max-w-md py-6 bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-black text-3xl rounded-sm transition-all active:scale-95 glitch-hover shadow-[0_0_40px_rgba(0,255,255,0.5)] uppercase tracking-tighter"
                >
                  START OPERATION
                </button>
              </div>
            )}

            {state.phase === GamePhase.PLAYER_TURN && (
              <div className="flex gap-8 w-full max-w-2xl">
                <button
                  onClick={playerHit}
                  disabled={isRolling}
                  className="flex-1 py-8 border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black font-orbitron font-bold text-2xl rounded-sm transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(0,255,255,0.2)] uppercase"
                >
                  HIT [1D6]
                </button>
                <button
                  onClick={playerStand}
                  className="flex-1 py-8 border-2 border-pink-500 text-pink-400 hover:bg-pink-500 hover:text-black font-orbitron font-bold text-2xl rounded-sm transition-all active:scale-95 shadow-[0_0_20px_rgba(255,0,255,0.2)] uppercase"
                >
                  STAND
                </button>
              </div>
            )}

            {state.phase === GamePhase.QUANTUM_CHOICE && (
              <div className="flex flex-col items-center gap-8 w-full">
                <div className="bg-pink-950/20 border border-pink-500/30 p-5 rounded-sm text-pink-400 text-center text-sm font-mono uppercase tracking-[0.2em] max-w-3xl leading-relaxed shadow-[0_0_15px_rgba(255,0,255,0.05)]">
                  [RECOVERY PROTOCOL AVAILABLE] <br/> ONE FINAL 1D6 DRAW. WIN TO SECURE 100-200% RETURN. <br/> 
                  LOSE OR BUST RESULTS IN 150% LIQUIDATION.
                </div>
                <div className="flex gap-8 w-full max-w-2xl">
                  <button
                    onClick={executeQuantumGamble}
                    disabled={isRolling}
                    className="flex-1 py-7 bg-pink-600 hover:bg-pink-500 text-white font-orbitron font-black text-2xl rounded-sm shadow-[0_0_50px_rgba(255,0,255,0.5)] transition-all animate-pulse active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                  >
                    ACTIVATE GAMBLE
                  </button>
                  <button
                    onClick={declineGamble}
                    className="flex-1 py-7 border-2 border-slate-800 text-slate-500 hover:text-white font-orbitron font-bold text-2xl rounded-sm transition-all active:scale-95 uppercase tracking-widest"
                  >
                    SURRENDER
                  </button>
                </div>
              </div>
            )}

            {state.phase === GamePhase.RESULT && (
              <button
                onClick={restartRound}
                className="w-full max-w-md py-6 bg-white text-black font-orbitron font-black text-3xl rounded-sm hover:bg-cyan-400 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.4)] uppercase tracking-tighter"
              >
                NEXT STAGE
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Aesthetic Overlays */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-30 z-50 animate-pulse" />
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-30 z-50 animate-pulse" />
      <div className="fixed top-0 left-4 bottom-0 w-[1px] bg-cyan-500/10 z-0" />
      <div className="fixed top-0 right-4 bottom-0 w-[1px] bg-pink-500/10 z-0" />
    </div>
  );
};

export default App;
