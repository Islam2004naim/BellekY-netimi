import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, Cpu, Activity, ArrowRightLeft, 
  Code2, Database, Shield, Box, Share2, 
  Terminal, Monitor, Play, BookOpen, RotateCcw, 
  ChevronRight, ArrowUpCircle, ArrowDownCircle, Info, Layout,
  Download, Zap
} from 'lucide-react';
import './index.css';

const TEMPLATES = {
  c: {
    "Temel": `void main() {\n  int x = 10;\n  calculate();\n}\n\nvoid calculate() {\n  int y = 20;\n}`,
    "Dinamik": `void main() {\n  int* p = malloc(4);\n  int x = 100;\n}`,
    "Özyineleme": `void main() {\n  factorial(5);\n}\n\nint factorial(int n) {\n  if (n <= 1) return 1;\n  return factorial(n - 1);\n}`
  },
  java: {
    "Nesne": `public static void main() {\n  User u = new User();\n  process();\n}\n\nvoid process() {\n  int data = 500;\n}`,
    "Faktöriyel": `public static void main() {\n  fact(4);\n}\n\nint fact(int n) {\n  return fact(n-1);\n}`,
    "Referans": `void main() {\n  Car c = 1;\n  drive();\n}`
  },
  python: {
    "Lambda": `def main():\n  x = 10\n  f = lambda y: x+y\n  f(5)\n\nmain()`,
    "Dinamik": `def start():\n  a = 1\n  run()\n\nstart()`
  }
};

const App = () => {
  // CONFIG STATE
  const [language, setLanguage] = useState('c'); // 'c', 'java', 'python'
  const [growthDirection, setGrowthDirection] = useState('down'); 
  const [activeTab, setActiveTab] = useState('theory');

  // SIMULATION STATE
  const [code, setCode] = useState(TEMPLATES.c["Temel"]);
  const [pc, setPc] = useState(0); 
  const [sp, setSp] = useState('0x7FFF');
  const [fp, setFp] = useState('0x7FFF');
  const [stack, setStack] = useState([]);
  const [heap, setHeap] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);
  const [isDeepView, setIsDeepView] = useState(false);
  const [history, setHistory] = useState([]); // Undo history
  const [error, setError] = useState(null); // Error message (e.g. Stack Overflow)

  // Syntax Highlighting Logic
  const highlightCode = (codeText) => {
    const keywords = /\b(void|int|float|double|public|static|def|return|class|if|else|for|while)\b/g;
    const functions = /\b([a-zA-Z0-9_]+)(?=\()/g;
    const values = /\b([0-9]+)\b/g;
    
    return codeText.split('\n').map((line, i) => {
      let highlighted = line
        .replace(keywords, '<span class="hl-keyword">$1</span>')
        .replace(functions, '<span class="hl-func">$1</span>')
        .replace(values, '<span class="hl-val">$1</span>');
      return <div key={i} dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }} />;
    });
  };

  const exportState = () => {
    const data = `MEMORY REPORT - ${new Date().toLocaleString()}\nLanguage: ${language.toUpperCase()}\nPC: ${pc}\nStack Frames: ${stack.length}\nHeap Objects: ${heap.length}\n\nSTACK CONTENT:\n${stack.map(f => `[${f.name}] -> vars: ${f.vars.map(v => `${v.name}=${v.value}`).join(', ')}`).join('\n')}\n\nHEAP CONTENT:\n${heap.map((h, i) => `Object ${i}: ${h.label}`).join('\n')}`;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `memory_report_${language}.txt`;
    link.click();
  };

  const currentTheme = language === 'python' ? 'theme-python' : language === 'java' ? 'theme-java' : 'theme-c';

  // RESET SIMULATION
  const resetSimulation = () => {
    setPc(0);
    setStep(0);
    setSp(growthDirection === 'down' ? '0x7FFF' : '0x0000');
    setFp(growthDirection === 'down' ? '0x7FFF' : '0x0000');
    setStack([]);
    setHeap([]); // Reset Heap
    setError(null);
    setIsRunning(false);
  };

  useEffect(() => {
    const firstKey = Object.keys(TEMPLATES[language])[0];
    setCode(TEMPLATES[language][firstKey]);
    resetSimulation();
  }, [language]);

  useEffect(() => {
    resetSimulation();
  }, [growthDirection]);

  // SIMULATION ENGINE (STEP LOGIC)
  const nextStep = () => {
    const allLines = code.split('\n');
    const nonEmptyLineIndices = allLines
      .map((line, index) => ({ line: line.trim(), index }))
      .filter(item => item.line !== '');

    if (step >= nonEmptyLineIndices.length || error) return;

    const { line: currentLine, index: actualLineIndex } = nonEmptyLineIndices[step];
    setPc(actualLineIndex);

    // Stack Overflow Check
    if (stack.length > 10) {
        setError("STACK OVERFLOW! Bellek sınırı aşıldı (Recursion Depth Limit).");
        setIsRunning(false);
        return;
    }

    // SAVE TO HISTORY BEFORE UPDATE
    setHistory(prev => [...prev, { pc, sp, fp, stack, heap, step }]);

    let newStack = [...stack];
    let currentSp = parseInt(sp, 16);
    const offset = growthDirection === 'down' ? -16 : 16;

    // 1. Function Call Detection
    const isFuncDef = language === 'python' 
      ? currentLine.includes('def ')
      : (currentLine.includes('void') || currentLine.includes('static') || currentLine.includes('int ')) && currentLine.includes('(');
    
    const isFuncCall = currentLine.includes('()') || (currentLine.includes('(') && currentLine.includes(')') && !isFuncDef);

    if ((isFuncDef || isFuncCall) && !currentLine.includes('=') && !currentLine.includes('print')) {
        const frameNameMatch = currentLine.match(/([a-zA-Z0-9_]+)\s*\(/);
        const frameName = frameNameMatch?.[1] || 'Frame';
        
        const dynamicLink = stack.length > 0 ? stack[stack.length - 1].fp : '0x0000';
        newStack.push({
          id: `frame-${Date.now()}`,
          name: language === 'python' ? 'Python Frame' : 'Stack Frame',
          func: frameName,
          fp: `0x${currentSp.toString(16).toUpperCase()}`,
          dynamicLink: dynamicLink,
          returnAddr: `0x0${(actualLineIndex * 4).toString(16).toUpperCase()}`,
          vars: []
        });
        setFp(`0x${currentSp.toString(16).toUpperCase()}`);
        currentSp += offset;
    }

    // 2. Variable & Heap Allocation
    // Support for: int x = 10, x = 10, int* p = malloc(10), User u = new User()
    const isAssignment = currentLine.includes('=');
    
    if (isAssignment) {
        const varMatch = currentLine.match(/(?:[a-zA-Z0-9_*]+\s+)?([a-zA-Z0-9_]+)\s*=\s*(.+)/);
        
        if (varMatch && newStack.length > 0) {
            const varName = varMatch[1].trim();
            const rawValue = varMatch[2].trim().replace(';', '');
            
            let varValue = rawValue;
            let isHeapAlloc = false;

            // Detect Heap Allocation (malloc or new)
            if (rawValue.includes('malloc') || rawValue.includes('new ')) {
                isHeapAlloc = true;
                const heapLabel = rawValue.includes('malloc') ? `Alloc(${varName})` : `Obj(${rawValue.split(' ').pop()})`;
                setHeap(prev => [...prev, { label: heapLabel }]);
                varValue = `Heap@${Math.floor(Math.random() * 1000).toString(16).toUpperCase()}`;
            } else if (language === 'java' || language === 'python') {
                // In Java/Python, almost everything is an object on heap in this simulator's logic
                setHeap(prev => [...prev, { label: `Obj(${rawValue})` }]);
                varValue = `${language === 'java' ? 'Ref' : 'Obj'}@${rawValue}`;
            }

            const activeFrameIndex = newStack.length - 1;
            const updatedFrame = { ...newStack[activeFrameIndex] };
            updatedFrame.vars = [...updatedFrame.vars, {
                name: varName,
                value: varValue,
                addr: `0x${currentSp.toString(16).toUpperCase()}`
            }];
            newStack[activeFrameIndex] = updatedFrame;
            currentSp += offset;
        }
    }

    setStack(newStack);
    setSp(`0x${(currentSp >= 0 ? currentSp : 0).toString(16).toUpperCase()}`);
    setStep(step + 1);
  };

  const runAll = () => {
    if (isRunning) return;
    setIsRunning(true);
  };

  // AUTO-RUN EFFECT
  useEffect(() => {
    if (!isRunning) return;
    const allLines = code.split('\n');
    const nonEmptyLineIndices = allLines.filter(l => l.trim() !== '');
    
    if (step >= nonEmptyLineIndices.length) {
      setIsRunning(false);
      return;
    }
    const timer = setTimeout(() => {
      nextStep();
    }, playbackSpeed);
    return () => clearTimeout(timer);
  }, [isRunning, step, code]);

  // RESET ON CODE CHANGE
  useEffect(() => {
    resetSimulation();
  }, [code]);

  const stepBack = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setPc(lastState.pc);
    setSp(lastState.sp);
    setFp(lastState.fp);
    setStack(lastState.stack);
    setHeap(lastState.heap);
    setStep(lastState.step);
    setHistory(prev => prev.slice(0, -1));
  };

  return (
    <div className={`app-container ${currentTheme}`}>
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon"><Database size={20} color="white" /></div>
          <span>BELLEK LABORATUVARI</span>
        </div>
        
        <div className="header-controls" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Speed Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '10px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px' }}>
            <Activity size={12} color="#888" />
            <input 
              type="range" min="100" max="2000" step="100" 
              value={playbackSpeed} 
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              style={{ width: '60px', accentColor: 'var(--theme-primary)' }}
            />
            <span style={{ fontSize: '0.65rem', color: '#888', minWidth: '35px' }}>{playbackSpeed}ms</span>
          </div>

          <button className={`btn ${isDeepView ? 'btn-primary' : ''}`} onClick={() => setIsDeepView(!isDeepView)} title="Deep View (Hardware Level)">
            <Zap size={16} color={isDeepView ? '#fff' : '#888'} />
          </button>
          <button className="btn" onClick={exportState} title="Export Report"><Download size={16} /></button>
          <button className="btn" onClick={resetSimulation}><RotateCcw size={16} /> Sıfırla</button>
          <button className="btn" onClick={stepBack} disabled={history.length === 0}><RotateCcw size={16} style={{ transform: 'scaleX(-1)' }} /> Geri Al</button>
          <button className="btn btn-primary" onClick={nextStep}><ChevronRight size={16} /> Adım At</button>
          <button className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={runAll} disabled={isRunning}>
            <Play size={16} /> {isRunning ? 'Çalışıyor...' : 'Çalıştır'}
          </button>
        </div>

        <div className="lang-switcher">
          <div className="switch-container">
            <span>Standart (Down)</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={growthDirection === 'up'} 
                onChange={(e) => setGrowthDirection(e.target.checked ? 'up' : 'down')}
              />
              <span className="slider"></span>
            </label>
            <span>Anti-gravity (Up)</span>
          </div>

          <div className="lang-toggle" style={{ background: '#18181b', padding: '4px', borderRadius: '12px', display: 'flex', gap: '4px' }}>
            <select 
              className="btn" 
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.75rem' }}
              defaultValue="default"
              onChange={(e) => {
                const val = e.target.value;
                setCode(TEMPLATES[language][val]);
                resetSimulation();
              }}
            >
              <option value="default" disabled>📚 Senaryo Seç</option>
              {Object.keys(TEMPLATES[language]).map(key => (
                <option key={key} value={key} style={{background:'#111'}}>{key}</option>
              ))}
            </select>
            <button className={`btn ${language === 'c' ? 'btn-primary' : ''}`} onClick={() => setLanguage('c')}>C</button>
            <button className={`btn ${language === 'java' ? 'btn-primary' : ''}`} onClick={() => setLanguage('java')}>Java</button>
            <button className={`btn ${language === 'python' ? 'btn-primary' : ''}`} onClick={() => setLanguage('python')}>Python</button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="main-layout">
        
        <section className="panel">
          <div className="panel-header"><Database size={16} /> GÖRSEL BELLEK (STACK)</div>
          <div className="stack-container" style={{ flexDirection: growthDirection === 'down' ? 'column' : 'column-reverse' }}>
            <div className="stack-growth-indicator">
              {growthDirection === 'down' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
            </div>
            {stack.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#3f3f46' }}>
                <Box size={48} strokeWidth={1} style={{ marginBottom: '1rem' }} />
                <p style={{ fontSize: '0.8rem' }}>Bellek Henüz Boş</p>
              </div>
            )}
            
            {error && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid #ef4444', 
                color: '#ef4444', 
                padding: '10px', 
                borderRadius: '8px', 
                fontSize: '0.7rem',
                margin: '10px',
                textAlign: 'center',
                animation: 'shake 0.5s ease'
              }}>
                <Shield size={16} style={{ marginBottom: '5px' }} />
                <div>{error}</div>
              </div>
            )}

            {stack.map((frame) => (
              <div key={frame.id} className="stack-frame">
                <div className="frame-header">
                  <span>{frame.name}: {frame.func}()</span>
                  <span>FP: {frame.fp}</span>
                </div>
                <div className="frame-body">
                  <div className="frame-item"><span className="label">Return Addr:</span><span className="value hex">{frame.returnAddr}</span></div>
                  <div className="frame-item"><span className="label">Dynamic Link:</span><span className="value link">{frame.dynamicLink}</span></div>
                  {frame.vars.map((v, vi) => (
                    <div key={vi} className={`frame-item ${v.value.includes('@') ? 'ref-active' : ''}`} style={{ 
                      borderTop: '1px solid #18181b', 
                      padding: '6px', 
                      marginTop: '4px',
                      borderRadius: '4px',
                      transition: 'all 0.3s ease',
                      border: v.value.includes('@') ? '1px solid var(--theme-primary)' : 'none',
                      boxShadow: v.value.includes('@') ? '0 0 10px var(--theme-glow)' : 'none'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="label" style={{ color: v.value.includes('@') ? 'var(--theme-primary)' : 'var(--text-secondary)' }}>{v.name}:</span>
                        {v.value.includes('@') && (
                          <span className="pointer-link"><ArrowRightLeft size={10} /> Reference</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="value" style={{ fontWeight: v.value.includes('@') ? 'bold' : 'normal', fontFamily: 'monospace' }}>
                          {isDeepView && !v.value.includes('@') ? Number(v.value).toString(2).padStart(8, '0') : v.value}
                        </span>
                        <div className="value hex" style={{ fontSize: '0.65rem' }}>[{v.addr}]</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* CPU Registers Panel - High Tech Style */}
          <div className="registers-panel" style={{ padding: '15px', background: '#050507', borderTop: '1px solid #1a1a1e' }}>
            <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div className="reg-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid #1a1a1a', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>PC</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--theme-primary)', fontSize: '0.9rem' }}>{pc < 10 ? `0${pc}` : pc}</div>
              </div>
              <div className="reg-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid #1a1a1a', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>SP</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--theme-primary)', fontSize: '0.9rem' }}>{sp}</div>
              </div>
              <div className="reg-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid #1a1a1a', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>FP</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--theme-primary)', fontSize: '0.9rem' }}>{fp}</div>
              </div>
            </div>
          </div>


          {/* Heap Memory Area */}
          <div className="heap-area">
            <div className="heap-title"><Share2 size={14} /> HEAP (DİNAMİK BELLEK)</div>
            <div className="heap-grid">
              {heap.length === 0 && <span style={{fontSize:'0.7rem', color:'var(--text-secondary)'}}>Heap Boş</span>}
              {heap.map((obj, idx) => {
                const isReferenced = stack.some(f => f.vars.some(v => v.value.includes(`@${obj.label.match(/\((.*)\)/)?.[1]}`)));
                return (
                  <div key={idx} className="heap-obj" style={{ 
                    border: isReferenced ? '2px solid var(--theme-primary)' : '1px solid var(--border-color)',
                    boxShadow: isReferenced ? '0 0 15px var(--theme-glow)' : 'none',
                    transform: isReferenced ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                    fontFamily: isDeepView ? 'monospace' : 'inherit',
                    fontSize: isDeepView ? '0.6rem' : '0.7rem'
                  }}>
                    {isDeepView ? `[BYTE_CHUNK: ${Number(obj.label.match(/\d+/)?.[0] || 0).toString(2).padStart(8, '0')}]` : obj.label}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Middle: Professional IDE-style Editor + Dashboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <section className="editor-container" style={{ flex: 1, margin: '0' }}>
            <div className="line-numbers">
              {code.split('\n').map((_, i) => (
                <div key={i} style={{ color: pc === i ? 'var(--theme-primary)' : '#444', fontWeight: pc === i ? 'bold' : 'normal' }}>
                  {i + 1}
                </div>
              ))}
            </div>
            <div style={{ position: 'relative', overflow: 'hidden', flex: 1 }}>
              <div 
                className="active-line-bg" 
                style={{ 
                  top: `${(pc * 1.6) + 1}rem`, 
                  height: '1.6rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderLeft: '3px solid var(--theme-primary)'
                }}
              ></div>
              <textarea 
                className="code-area" 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                spellCheck="false" 
              />
            </div>
          </section>

          {/* New Bottom Dashboard Panel */}
          <section className="panel dashboard-panel" style={{ flex: 1, minHeight: '220px' }}>
            <div className="panel-header">
              <Layout size={14} color="var(--theme-primary)" /> SISTEM ANALİZ VE PERFORMANS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', padding: '20px' }}>
              
              {/* Task State Statistics */}
              <div style={{ background: 'rgba(255,255,255,0.015)', padding: '16px', borderRadius: '12px', border: '1px solid #1a1a1a' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: '800', marginBottom: '15px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>BELLEK DAĞILIMI</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ position: 'relative' }}>
                    <svg width="80" height="80" viewBox="0 0 32 32">
                      <circle r="16" cx="16" cy="16" fill="#09090b" />
                      <circle r="16" cx="16" cy="16" fill="transparent" stroke="#3b82f6" strokeWidth="6" strokeDasharray={`${Math.min(stack.length * 15, 100)} 100`} />
                      <circle r="16" cx="16" cy="16" fill="transparent" stroke="#10b981" strokeWidth="6" strokeDasharray={`${Math.min(heap.length * 15, 100)} 100`} strokeDashoffset={`-${Math.min(stack.length * 15, 100)}`} />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.6rem', fontWeight: 'bold' }}>%{stack.length + heap.length}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3b82f6' }}></div> Stack</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }}></div> Heap</div>
                  </div>
                </div>
              </div>

              {/* Memory Growth Trend */}
              <div style={{ background: 'rgba(255,255,255,0.015)', padding: '16px', borderRadius: '12px', border: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>BELLEK AKIŞI</p>
                  <div style={{ fontSize: '0.65rem', color: 'var(--theme-primary)', fontWeight: 'bold' }}>REAL-TIME FEED</div>
                </div>
                <svg width="100%" height="80" style={{ overflow: 'visible' }}>
                  <polyline
                    fill="none"
                    stroke="var(--theme-primary)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    points={Array.from({ length: step + 1 }).map((_, i) => `${(i * 30)},${80 - (i * 8 + 10)}`).join(' ')}
                    style={{ transition: 'all 0.5s ease' }}
                  />
                  {Array.from({ length: step + 1 }).map((_, i) => (
                    <circle key={i} cx={(i * 30)} cy={80 - (i * 8 + 10)} r="3" fill="var(--theme-primary)" style={{ transition: 'all 0.5s ease' }} />
                  ))}
                </svg>
              </div>
            </div>
          </section>
        </div>

        <section className="panel panel-last">
          <div className="panel-header"><Activity size={16} color="var(--theme-primary)" /> CANLI ANALİZ PANELI</div>
          <div className="theory-content">
            {/* CPU Internal / ALU (Only in Deep View) */}
            {isDeepView && (
              <div className="theory-card" style={{ background: 'rgba(59,130,246,0.05)', borderLeft: '4px solid var(--theme-primary)', marginBottom: '15px' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--theme-primary)', marginBottom: '10px' }}>CPU INTERNAL / ALU</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                    <span style={{ color: '#888' }}>Opcode:</span>
                    <span style={{ fontFamily: 'monospace', color: '#fff' }}>EXEC_STEP_{step}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                    <span style={{ color: '#888' }}>Binary PC:</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--theme-primary)' }}>{pc.toString(2).padStart(8, '0')}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--theme-primary)', opacity: 0.2 }}></div>
                  <div style={{ textAlign: 'center', fontSize: '0.6rem', color: 'var(--theme-primary)', animation: 'pulse 1s infinite' }}>ALU PROCESSING...</div>
                </div>
              </div>
            )}
            
            <div className="theory-card" style={{ background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid var(--theme-primary)', padding: '15px', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '10px' }}>{language.toUpperCase()} Mimari Özeti</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {language === 'python' && "Python'da bellek yönetimi referانس sayımı ile yapılır. Her veri bir objedir."}
                {language === 'java' && "JVM, nesneleri Heap'te, metot çağrılarını Stack'te yönetir."}
                {language === 'c' && "C dilinde kapsam statiktir. Bellek yerleşimi derleme zamanında belirlenir."}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
              <div className="reg-item">
                <div className="reg-label">Stack Depth</div>
                <div className="reg-value">{stack.length}</div>
              </div>
              <div className="reg-item">
                <div className="reg-label">Heap Objects</div>
                <div className="reg-value">{heap.length}</div>
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
};

export default App;
