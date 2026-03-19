import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

interface EnumParam {
  path: string;
  value: number;
  min: number;
  max: number;
  enumValues: string[];
}

interface ChannelData {
  path: string;
  name: string;
  fader: { path: string; value: number; min: number; max: number; factor: number };
  mute: { path: string; value: boolean };
  eq: {
    on: { path: string; value: boolean };
    bands: Array<{
      gain: { path: string; value: number; min: number; max: number; factor: number };
      freq: { path: string; value: number; min: number; max: number };
      q: { path: string; value: number; min: number; max: number; factor: number };
      on: { path: string; value: boolean };
      type?: EnumParam;
      slope?: EnumParam;
    }>;
  };
  compressor: {
    on: { path: string; value: boolean };
    threshold: { path: string; value: number; min: number; max: number; factor: number };
    ratio: { path: string; value: number; min: number; max: number };
    attack: { path: string; value: number; min: number; max: number; factor: number };
    release: { path: string; value: number; min: number; max: number; factor: number };
  };
  pan: {
    on: { path: string; value: boolean };
    slope: { path: string; value: number; min: number; max: number };
  };
  inputGain: {
    gain: { path: string; value: number; min: number; max: number; factor: number };
    phase: { path: string; value: boolean };
  };
  metering: {
    main: { path: string; value: number; min: number; max: number; factor: number };
    input: { path: string; value: number; min: number; max: number; factor: number };
    insert: { path: string; value: number; min: number; max: number; factor: number };
    directOut: { path: string; value: number; min: number; max: number; factor: number };
  };
}

type MeteringType = 'main' | 'input' | 'insert' | 'directOut';
const METERING_LABELS: Record<MeteringType, string> = {
  main: 'Post-Fader',
  input: 'Input',
  insert: 'Insert',
  directOut: 'Direct Out'
};

interface ChannelStripProps {
  channelPath: string;
  onClose: () => void;
}

type ModuleType = 'eq' | 'comp' | null;

function formatDb(value: number, factor: number): string {
  const db = value / factor;
  if (db <= -128) return '-∞';
  return db >= 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
}

function Knob({ 
  value, min, max, label, unit = '', size = 'md'
}: { 
  value: number; min: number; max: number; label: string; unit?: string; size?: 'sm' | 'md';
}) {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + normalized * 270;
  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const indicatorClass = size === 'sm' ? 'h-2' : 'h-3';
  
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div 
        className={`${sizeClass} rounded-full bg-gray-700 border-2 border-gray-600 relative cursor-pointer`}
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <div className={`absolute top-1 left-1/2 w-0.5 ${indicatorClass} bg-cyan-400 -translate-x-1/2`} />
      </div>
      <span className="text-[9px] text-gray-400">{label}</span>
      <span className="text-[8px] text-cyan-400">{value.toFixed(1)}{unit}</span>
    </div>
  );
}

function ModuleButton({ 
  label, isOn, isActive, onClick 
}: { 
  label: string; isOn: boolean; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between px-2 py-1 rounded text-[10px] font-semibold transition-all w-full ${
        isActive 
          ? 'bg-cyan-600 text-white' 
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`}
    >
      <span>{label}</span>
      <div className={`w-2 h-2 rounded-full ${isOn ? 'bg-green-400' : 'bg-gray-600'}`} />
    </button>
  );
}

const BAND_NAMES = ['Low', 'L-Mid', 'H-Mid', 'High'];

interface EQDetailPanelProps {
  eq: ChannelData['eq'];
  onClose: () => void;
  onUpdateBand?: (bandIndex: number, param: 'gain' | 'freq' | 'q' | 'on' | 'type', value: number | boolean) => void;
}

function EQDetailPanel({ eq, onClose, onUpdateBand }: EQDetailPanelProps) {
  const [selectedBand, setSelectedBand] = useState(0);
  const [localBands, setLocalBands] = useState(eq.bands);
  const [draggingBand, setDraggingBand] = useState<number | null>(null);
  const [draggingKnob, setDraggingKnob] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const knobStartRef = useRef<{ value: number; y: number } | null>(null);
  
  const band = localBands[selectedBand];

  // Sync local state with props
  useEffect(() => {
    setLocalBands(eq.bands);
  }, [eq.bands]);
  
  // Convertir freq en position X (log scale 20Hz - 20kHz)
  const freqToX = (freq: number) => {
    const minLog = Math.log10(20);
    const maxLog = Math.log10(20000);
    const freqLog = Math.log10(Math.max(20, freq));
    return ((freqLog - minLog) / (maxLog - minLog)) * 380 + 10;
  };

  const xToFreq = (x: number) => {
    const minLog = Math.log10(20);
    const maxLog = Math.log10(20000);
    const normalized = (x - 10) / 380;
    return Math.pow(10, minLog + normalized * (maxLog - minLog));
  };
  
  // Convertir gain en position Y (-12dB à +12dB)
  const gainToY = (gain: number) => {
    const normalized = (gain + 12) / 24;
    return 140 - normalized * 120;
  };

  const yToGain = (y: number) => {
    const normalized = (140 - y) / 120;
    return normalized * 24 - 12;
  };

  // Générer la courbe EQ
  const generateCurve = () => {
    const points: string[] = [];
    for (let i = 0; i <= 380; i += 2) {
      const minLog = Math.log10(20);
      const maxLog = Math.log10(20000);
      const freqLog = minLog + (i / 380) * (maxLog - minLog);
      const freq = Math.pow(10, freqLog);
      
      let totalGain = 0;
      localBands.forEach(b => {
        if (!b.on.value) return;
        const bandFreq = b.freq.value;
        const bandGain = b.gain.value / b.gain.factor;
        const bandQ = Math.max(0.1, b.q.value / b.q.factor);
        const octaves = Math.log2(freq / bandFreq);
        const response = bandGain * Math.exp(-0.5 * Math.pow(octaves * bandQ * 2, 2));
        totalGain += response;
      });
      
      const y = gainToY(Math.max(-12, Math.min(12, totalGain)));
      points.push(`${i + 10},${y}`);
    }
    return `M ${points.join(' L ')}`;
  };

  const formatFreq = (freq: number) => {
    if (freq >= 1000) return `${(freq / 1000).toFixed(2)} kHz`;
    return `${freq.toFixed(0)} Hz`;
  };

  // Handle point drag on SVG
  const handlePointMouseDown = (e: React.MouseEvent, bandIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingBand(bandIndex);
    setSelectedBand(bandIndex);
  };

  useEffect(() => {
    if (draggingBand === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * 400;
      const svgY = ((e.clientY - rect.top) / rect.height) * 150;
      
      const newFreq = Math.max(20, Math.min(20000, xToFreq(svgX)));
      const newGain = Math.max(-12, Math.min(12, yToGain(svgY)));
      
      setLocalBands(prev => {
        const updated = [...prev];
        const b = updated[draggingBand];
        updated[draggingBand] = {
          ...b,
          freq: { ...b.freq, value: Math.round(newFreq) },
          gain: { ...b.gain, value: Math.round(newGain * b.gain.factor) }
        };
        return updated;
      });
    };

    const handleMouseUp = () => {
      if (draggingBand !== null && onUpdateBand) {
        const b = localBands[draggingBand];
        onUpdateBand(draggingBand, 'freq', b.freq.value);
        onUpdateBand(draggingBand, 'gain', b.gain.value);
      }
      setDraggingBand(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBand, localBands, onUpdateBand]);

  // Handle knob drag
  const handleKnobMouseDown = (e: React.MouseEvent, knobId: string, currentValue: number) => {
    e.preventDefault();
    setDraggingKnob(knobId);
    knobStartRef.current = { value: currentValue, y: e.clientY };
  };

  useEffect(() => {
    if (!draggingKnob) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!knobStartRef.current) return;
      const delta = (knobStartRef.current.y - e.clientY) / 100;
      
      setLocalBands(prev => {
        const updated = [...prev];
        const b = updated[selectedBand];
        
        if (draggingKnob === 'freq') {
          const range = Math.log10(b.freq.max) - Math.log10(b.freq.min);
          const newLog = Math.log10(knobStartRef.current!.value) + delta * range;
          const newFreq = Math.max(b.freq.min, Math.min(b.freq.max, Math.pow(10, newLog)));
          updated[selectedBand] = { ...b, freq: { ...b.freq, value: Math.round(newFreq) } };
        } else if (draggingKnob === 'gain') {
          const range = (b.gain.max - b.gain.min) / b.gain.factor;
          const newGain = knobStartRef.current!.value + delta * range;
          const clampedGain = Math.max(b.gain.min / b.gain.factor, Math.min(b.gain.max / b.gain.factor, newGain));
          updated[selectedBand] = { ...b, gain: { ...b.gain, value: Math.round(clampedGain * b.gain.factor) } };
        } else if (draggingKnob === 'q') {
          const range = (b.q.max - b.q.min) / b.q.factor;
          const newQ = knobStartRef.current!.value + delta * range;
          const clampedQ = Math.max(b.q.min / b.q.factor, Math.min(b.q.max / b.q.factor, newQ));
          updated[selectedBand] = { ...b, q: { ...b.q, value: Math.round(clampedQ * b.q.factor) } };
        }
        return updated;
      });
    };

    const handleMouseUp = () => {
      if (draggingKnob && onUpdateBand) {
        const b = localBands[selectedBand];
        if (draggingKnob === 'freq') onUpdateBand(selectedBand, 'freq', b.freq.value);
        else if (draggingKnob === 'gain') onUpdateBand(selectedBand, 'gain', b.gain.value);
        else if (draggingKnob === 'q') onUpdateBand(selectedBand, 'q', b.q.value);
      }
      setDraggingKnob(null);
      knobStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingKnob, selectedBand, localBands, onUpdateBand]);

  const toggleBandOn = (bandIndex: number) => {
    setLocalBands(prev => {
      const updated = [...prev];
      updated[bandIndex] = { ...updated[bandIndex], on: { ...updated[bandIndex].on, value: !updated[bandIndex].on.value } };
      return updated;
    });
    if (onUpdateBand) {
      onUpdateBand(bandIndex, 'on', !localBands[bandIndex].on.value);
    }
  };

  return (
    <div className="absolute left-full top-0 ml-2 bg-gray-900 border border-gray-600 rounded-lg p-4 shadow-xl z-10 w-[450px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-bold text-white">EQUALIZER</span>
        <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Graph - Full width */}
      <svg 
        ref={svgRef}
        viewBox="0 0 400 150" 
        className={`w-full h-44 bg-gray-800 rounded-lg ${draggingBand !== null ? 'cursor-grabbing' : ''}`}
        style={{ touchAction: 'none' }}
      >
        {/* Grid lines horizontal */}
        <line x1="10" y1="80" x2="390" y2="80" stroke="#444" strokeWidth="1" />
        <line x1="10" y1="20" x2="390" y2="20" stroke="#333" strokeWidth="0.5" strokeDasharray="3,3" />
        <line x1="10" y1="50" x2="390" y2="50" stroke="#333" strokeWidth="0.5" strokeDasharray="2,4" />
        <line x1="10" y1="110" x2="390" y2="110" stroke="#333" strokeWidth="0.5" strokeDasharray="2,4" />
        <line x1="10" y1="140" x2="390" y2="140" stroke="#333" strokeWidth="0.5" strokeDasharray="3,3" />
        
        {/* Frequency markers vertical */}
        {[50, 100, 200, 500, 1000, 2000, 5000, 10000].map(f => (
          <line key={f} x1={freqToX(f)} y1="10" x2={freqToX(f)} y2="145" stroke="#333" strokeWidth="0.5" />
        ))}
        
        {/* dB scale */}
        <text x="392" y="23" fill="#666" fontSize="9">+12</text>
        <text x="392" y="83" fill="#666" fontSize="9">0 dB</text>
        <text x="392" y="143" fill="#666" fontSize="9">-12</text>
        
        {/* Freq scale */}
        <text x="5" y="148" fill="#555" fontSize="8">20</text>
        <text x={freqToX(100) - 8} y="148" fill="#555" fontSize="8">100</text>
        <text x={freqToX(1000) - 6} y="148" fill="#555" fontSize="8">1k</text>
        <text x={freqToX(10000) - 10} y="148" fill="#555" fontSize="8">10k</text>
        
        {/* EQ Curve */}
        <path d={generateCurve()} fill="none" stroke="#22d3ee" strokeWidth="2.5" />
        
        {/* Band points - draggable */}
        {localBands.map((b, i) => {
          const cx = freqToX(b.freq.value);
          const cy = gainToY(b.gain.value / b.gain.factor);
          const isSelected = selectedBand === i;
          const isOn = b.on.value;
          
          return (
            <g 
              key={i} 
              onMouseDown={(e) => handlePointMouseDown(e, i)}
              className={`cursor-grab ${draggingBand === i ? 'cursor-grabbing' : ''}`}
              style={{ opacity: isOn ? 1 : 0.4 }}
            >
              <circle cx={cx} cy={cy} r={20} fill="transparent" />
              <circle 
                cx={cx} cy={cy}
                r={isSelected ? 14 : 10}
                fill={isSelected ? '#22d3ee' : '#0891b2'}
                stroke={isSelected ? '#fff' : '#22d3ee'}
                strokeWidth={isSelected ? 3 : 1}
              />
              <text 
                x={cx} y={cy + 4}
                fill={isSelected ? '#000' : '#fff'}
                fontSize="11" fontWeight="bold" textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Band selector with ON/OFF */}
      <div className="flex mt-3 gap-2">
        {BAND_NAMES.map((name, i) => (
          <div key={i} className="flex-1 flex flex-col gap-1">
            <button
              onClick={() => setSelectedBand(i)}
              className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                selectedBand === i 
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {name}
            </button>
            <button
              onClick={() => toggleBandOn(i)}
              className={`py-1 rounded text-[10px] font-semibold transition-all ${
                localBands[i].on.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-600 text-gray-400'
              }`}
            >
              {localBands[i].on.value ? 'ON' : 'OFF'}
            </button>
          </div>
        ))}
      </div>

      {/* Type selector if available */}
      {band.type && band.type.enumValues.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] text-gray-500 mb-1">Type</div>
          <div className="flex gap-1">
            {band.type.enumValues.map((typeName: string, i: number) => (
              <button
                key={i}
                onClick={() => onUpdateBand?.(selectedBand, 'type', band.type!.min + i)}
                className={`flex-1 py-1.5 rounded text-[10px] font-semibold transition-all ${
                  band.type?.value === band.type!.min + i
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {typeName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slope selector if available */}
      {band.slope && band.slope.enumValues.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] text-gray-500 mb-1">Slope</div>
          <div className="flex gap-1">
            {band.slope.enumValues.map((slopeName: string, i: number) => (
              <button
                key={i}
                onClick={() => onUpdateBand?.(selectedBand, 'type', band.slope!.min + i)}
                className={`flex-1 py-1.5 rounded text-[10px] font-semibold transition-all ${
                  band.slope?.value === i
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {slopeName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Knobs row - interactive */}
      <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-gray-700">
        <div 
          className={`text-center select-none ${draggingKnob === 'freq' ? 'cursor-ns-resize' : 'cursor-grab'}`}
          onMouseDown={(e) => handleKnobMouseDown(e, 'freq', band.freq.value)}
        >
          <DraggableKnob 
            value={band.freq.value} 
            min={band.freq.min} 
            max={band.freq.max}
            isLog={true}
          />
          <div className="text-[10px] text-gray-400 mt-1">Freq</div>
          <div className="text-xs text-cyan-400 font-mono">{formatFreq(band.freq.value)}</div>
        </div>
        <div 
          className={`text-center select-none ${draggingKnob === 'gain' ? 'cursor-ns-resize' : 'cursor-grab'}`}
          onMouseDown={(e) => handleKnobMouseDown(e, 'gain', band.gain.value / band.gain.factor)}
        >
          <DraggableKnob 
            value={band.gain.value / band.gain.factor} 
            min={band.gain.min / band.gain.factor} 
            max={band.gain.max / band.gain.factor}
          />
          <div className="text-[10px] text-gray-400 mt-1">Gain</div>
          <div className="text-xs text-cyan-400 font-mono">{(band.gain.value / band.gain.factor).toFixed(1)} dB</div>
        </div>
        <div 
          className={`text-center select-none ${draggingKnob === 'q' ? 'cursor-ns-resize' : 'cursor-grab'}`}
          onMouseDown={(e) => handleKnobMouseDown(e, 'q', band.q.value / band.q.factor)}
        >
          <DraggableKnob 
            value={band.q.value / band.q.factor} 
            min={band.q.min / band.q.factor} 
            max={band.q.max / band.q.factor}
          />
          <div className="text-[10px] text-gray-400 mt-1">Q</div>
          <div className="text-xs text-cyan-400 font-mono">{(band.q.value / band.q.factor).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

function DraggableKnob({ value, min, max, isLog = false }: { value: number; min: number; max: number; isLog?: boolean }) {
  let normalized: number;
  if (isLog) {
    const logMin = Math.log10(Math.max(1, min));
    const logMax = Math.log10(max);
    const logVal = Math.log10(Math.max(1, value));
    normalized = (logVal - logMin) / (logMax - logMin);
  } else {
    normalized = (value - min) / (max - min);
  }
  normalized = Math.max(0, Math.min(1, normalized));
  const angle = -135 + normalized * 270;
  
  return (
    <div 
      className="w-12 h-12 rounded-full bg-gray-700 border-2 border-gray-500 relative mx-auto"
      style={{ transform: `rotate(${angle}deg)` }}
    >
      <div className="absolute top-1.5 left-1/2 w-1 h-4 bg-cyan-400 -translate-x-1/2 rounded" />
    </div>
  );
}

function CompDetailPanel({ comp, onClose }: { comp: ChannelData['compressor']; onClose: () => void }) {
  return (
    <div className="absolute left-full top-0 ml-2 bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-xl z-10 w-40">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-white">COMPRESSOR</span>
        <button onClick={onClose} className="p-0.5 hover:bg-gray-700 rounded">
          <X className="w-3 h-3 text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Knob 
          value={comp.threshold.value / comp.threshold.factor} 
          min={comp.threshold.min / comp.threshold.factor} 
          max={comp.threshold.max / comp.threshold.factor} 
          label="Thresh"
          unit="dB"
          size="sm"
        />
        <Knob 
          value={comp.ratio.value / 100} 
          min={comp.ratio.min / 100} 
          max={comp.ratio.max / 100} 
          label="Ratio"
          size="sm"
        />
        <Knob 
          value={comp.attack.value / comp.attack.factor} 
          min={comp.attack.min / comp.attack.factor} 
          max={comp.attack.max / comp.attack.factor} 
          label="Attack"
          unit="ms"
          size="sm"
        />
        <Knob 
          value={comp.release.value / comp.release.factor} 
          min={comp.release.min / comp.release.factor} 
          max={comp.release.max / comp.release.factor} 
          label="Release"
          unit="ms"
          size="sm"
        />
      </div>
    </div>
  );
}

export function ChannelStrip({ channelPath, onClose }: ChannelStripProps) {
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<ModuleType>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [meteringType, setMeteringType] = useState<MeteringType>('main');
  const [showMeterMenu, setShowMeterMenu] = useState(false);
  const faderRef = useRef<HTMLDivElement>(null);
  const lastSentValue = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const channelRef = useRef<ChannelData | null>(null);

  // Keep channelRef in sync
  useEffect(() => { channelRef.current = channel; }, [channel]);

  const fetchChannel = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/channel/${channelPath}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to load channel');
      setChannel(data.data);
      setError(null);
      return data.data as ChannelData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [channelPath]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      const channelData = await fetchChannel();
      if (!channelData || !mounted) return;

      // Collect all parameter paths to subscribe (including metering)
      const params: string[] = [
        channelData.fader.path,
        channelData.mute.path,
        channelData.pan.slope.path,
        channelData.inputGain.phase.path,
        channelData.eq.on.path,
        channelData.compressor.on.path,
        ...channelData.eq.bands.flatMap(b => [b.gain.path, b.freq.path, b.q.path, b.on.path]),
        // Metering (all 4 types)
        channelData.metering.main.path,
        channelData.metering.input.path,
        channelData.metering.insert.path,
        channelData.metering.directOut.path,
      ].filter(Boolean);

      // Connect to WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        // Subscribe to channel parameters
        ws.send(JSON.stringify({ type: 'channel:subscribe', params }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          // Handle initial values after subscription
          if (msg.type === 'channel:subscribed' && msg.initialValues) {
            for (const { path, value } of msg.initialValues) {
              updateParamFromWs(path, value);
            }
          }
          
          // Handle real-time updates
          if (msg.type === 'param:update' && channelRef.current) {
            const { path, value } = msg.data;
            updateParamFromWs(path, value);
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        if (mounted) {
          // Reconnect after 2s
          setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      mounted = false;
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'channel:unsubscribe' }));
        wsRef.current.close();
      }
    };
  }, [channelPath]);

  // Update local state from WebSocket
  const updateParamFromWs = (path: string, value: unknown) => {
    setChannel(prev => {
      if (!prev) return prev;
      
      // Check which param changed
      if (path === prev.fader.path) {
        return { ...prev, fader: { ...prev.fader, value: value as number } };
      }
      if (path === prev.mute.path) {
        return { ...prev, mute: { ...prev.mute, value: value as boolean } };
      }
      if (path === prev.pan.slope.path) {
        return { ...prev, pan: { ...prev.pan, slope: { ...prev.pan.slope, value: value as number } } };
      }
      if (path === prev.inputGain.phase.path) {
        return { ...prev, inputGain: { ...prev.inputGain, phase: { ...prev.inputGain.phase, value: value as boolean } } };
      }
      if (path === prev.eq.on.path) {
        return { ...prev, eq: { ...prev.eq, on: { ...prev.eq.on, value: value as boolean } } };
      }
      if (path === prev.compressor.on.path) {
        return { ...prev, compressor: { ...prev.compressor, on: { ...prev.compressor.on, value: value as boolean } } };
      }
      
      // Check EQ bands
      const bands = prev.eq.bands.map(band => {
        if (path === band.gain.path) return { ...band, gain: { ...band.gain, value: value as number } };
        if (path === band.freq.path) return { ...band, freq: { ...band.freq, value: value as number } };
        if (path === band.q.path) return { ...band, q: { ...band.q, value: value as number } };
        if (path === band.on.path) return { ...band, on: { ...band.on, value: value as boolean } };
        return band;
      });
      
      if (bands !== prev.eq.bands) {
        return { ...prev, eq: { ...prev.eq, bands } };
      }

      // Check metering
      if (path === prev.metering.main.path) {
        return { ...prev, metering: { ...prev.metering, main: { ...prev.metering.main, value: value as number } } };
      }
      if (path === prev.metering.input.path) {
        return { ...prev, metering: { ...prev.metering, input: { ...prev.metering.input, value: value as number } } };
      }
      if (path === prev.metering.insert.path) {
        return { ...prev, metering: { ...prev.metering, insert: { ...prev.metering.insert, value: value as number } } };
      }
      if (path === prev.metering.directOut.path) {
        return { ...prev, metering: { ...prev.metering, directOut: { ...prev.metering.directOut, value: value as number } } };
      }
      
      return prev;
    });
  };

  const updateMute = (newValue: boolean) => {
    if (!channel) return;
    setChannel({ ...channel, mute: { ...channel.mute, value: newValue } });
    fetch(`/api/v1/channel/parameter/${channel.mute.path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newValue })
    }).catch(err => console.error('Failed to update mute:', err));
  };

  const updatePan = (newValue: number) => {
    if (!channel) return;
    setChannel({ ...channel, pan: { ...channel.pan, slope: { ...channel.pan.slope, value: newValue } } });
    fetch(`/api/v1/channel/parameter/${channel.pan.slope.path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newValue })
    }).catch(err => console.error('Failed to update pan:', err));
  };

  const updatePhase = (newValue: boolean) => {
    if (!channel) return;
    setChannel({ ...channel, inputGain: { ...channel.inputGain, phase: { ...channel.inputGain.phase, value: newValue } } });
    fetch(`/api/v1/channel/parameter/${channel.inputGain.phase.path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newValue })
    }).catch(err => console.error('Failed to update phase:', err));
  };

  const updateFaderLocal = (newValue: number) => {
    if (!channel) return;
    setChannel({ ...channel, fader: { ...channel.fader, value: newValue } });
  };

  const sendFaderValue = (newValue: number) => {
    if (!channel || lastSentValue.current === newValue) return;
    lastSentValue.current = newValue;
    fetch(`/api/v1/channel/parameter/${channel.fader.path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newValue })
    }).catch(err => console.error('Failed to update fader:', err));
  };

  const calcFaderValue = (clientY: number) => {
    if (!faderRef.current || !channel) return null;
    const rect = faderRef.current.getBoundingClientRect();
    const y = 1 - (clientY - rect.top) / rect.height;
    const clamped = Math.max(0, Math.min(1, y));
    return Math.round(channel.fader.min + clamped * (channel.fader.max - channel.fader.min));
  };

  const handleFaderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const value = calcFaderValue(e.clientY);
    if (value !== null) {
      updateFaderLocal(value);
      sendFaderValue(value);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    let lastSendTime = 0;
    const THROTTLE_MS = 50; // Envoyer max 20 fois par seconde

    const handleMouseMove = (e: MouseEvent) => {
      const value = calcFaderValue(e.clientY);
      if (value !== null) {
        updateFaderLocal(value);
        // Envoyer en continu avec throttle
        const now = Date.now();
        if (now - lastSendTime >= THROTTLE_MS) {
          sendFaderValue(value);
          lastSendTime = now;
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const value = calcFaderValue(e.clientY);
      if (value !== null) {
        sendFaderValue(value); // Toujours envoyer la valeur finale
      }
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, channel]);

  const toggleModule = (module: ModuleType) => {
    setExpandedModule(expandedModule === module ? null : module);
  };

  if (loading) {
    return (
      <div className="w-20 bg-gray-900 rounded-lg flex items-center justify-center h-80">
        <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="w-20 bg-gray-900 rounded-lg p-2 h-80">
        <div className="text-red-400 text-[9px]">{error || 'No data'}</div>
      </div>
    );
  }

  const faderNormalized = (channel.fader.value - channel.fader.min) / (channel.fader.max - channel.fader.min);
  const dbValue = formatDb(channel.fader.value, channel.fader.factor);

  return (
    <div className="w-20 bg-gradient-to-b from-gray-900 to-gray-950 rounded-lg border border-gray-700 shadow-xl flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between px-1.5 py-1 border-b border-gray-700 bg-gray-800/50 rounded-t-lg">
        <span className="text-[10px] font-bold text-white truncate flex-1">{channel.name}</span>
        <button onClick={onClose} className="p-0.5 hover:bg-gray-700 rounded">
          <X className="w-2.5 h-2.5 text-gray-400" />
        </button>
      </div>

      {/* Compact Module Buttons */}
      <div className="p-1.5 space-y-1">
        <ModuleButton 
          label="EQ" 
          isOn={channel.eq.on.value} 
          isActive={expandedModule === 'eq'}
          onClick={() => toggleModule('eq')}
        />
        <ModuleButton 
          label="COMP" 
          isOn={channel.compressor.on.value} 
          isActive={expandedModule === 'comp'}
          onClick={() => toggleModule('comp')}
        />
      </div>

      {/* Expanded Module Panels */}
      {expandedModule === 'eq' && (
        <EQDetailPanel eq={channel.eq} onClose={() => setExpandedModule(null)} />
      )}
      {expandedModule === 'comp' && (
        <CompDetailPanel comp={channel.compressor} onClose={() => setExpandedModule(null)} />
      )}

      {/* Pan Slider */}
      <div className="px-1.5 py-1">
        <div className="text-[8px] text-gray-500 text-center mb-0.5">PAN</div>
        <div className="relative h-3 bg-gray-800 rounded">
          <input
            type="range"
            min={channel.pan.slope.min}
            max={channel.pan.slope.max}
            value={channel.pan.slope.value}
            onChange={(e) => updatePan(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-gray-600 -translate-x-1/2 -translate-y-1/2" />
          <div 
            className="absolute top-0.5 w-2 h-2 bg-cyan-400 rounded-full shadow"
            style={{ left: `calc(${((channel.pan.slope.value - channel.pan.slope.min) / (channel.pan.slope.max - channel.pan.slope.min)) * 100}% - 4px)` }}
          />
        </div>
        <div className="flex justify-between text-[7px] text-gray-500">
          <span>L</span>
          <span>R</span>
        </div>
      </div>

      {/* Phase + Mute Buttons */}
      <div className="px-1.5 flex gap-1">
        <button
          onClick={() => updatePhase(!channel.inputGain.phase.value)}
          className={`flex-1 py-1 rounded text-[9px] font-bold transition-all ${
            channel.inputGain.phase.value 
              ? 'bg-yellow-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          Ø
        </button>
        <button
          onClick={() => updateMute(!channel.mute.value)}
          className={`flex-1 py-1 rounded text-[9px] font-bold transition-all ${
            channel.mute.value 
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/50' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          M
        </button>
      </div>

      {/* Fader with VU Meter */}
      <div className="flex-1 flex flex-col items-center p-1.5 pt-2">
        <span className="text-[10px] text-cyan-400 font-mono mb-1">{dbValue}</span>
        
        <div className="flex gap-0.5 flex-1 w-full">
          {/* VU Meter with context menu */}
          <div 
            className="w-3 bg-gray-800 rounded relative cursor-pointer"
            onContextMenu={(e) => {
              e.preventDefault();
              setShowMeterMenu(!showMeterMenu);
            }}
            title={`Metering: ${METERING_LABELS[meteringType]} (clic droit pour changer)`}
          >
            {(() => {
              const meter = channel.metering[meteringType];
              // Convert to dB and normalize: -60dB = 0%, 0dB = 83%, +15dB = 100%
              const dbVal = meter.value / meter.factor;
              const normalized = Math.max(0, Math.min(100, ((dbVal + 60) / 75) * 100));
              return (
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-400 to-red-500 rounded-b transition-all duration-75"
                  style={{ height: `${normalized}%` }}
                />
              );
            })()}
            {/* Meter type indicator */}
            <div className="absolute -top-3 left-0 right-0 text-[6px] text-gray-500 text-center truncate">
              {meteringType === 'main' ? 'M' : meteringType === 'input' ? 'I' : meteringType === 'insert' ? 'INS' : 'DO'}
            </div>
            
            {/* Context Menu */}
            {showMeterMenu && (
              <div className="absolute bottom-full left-0 mb-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 min-w-[80px]">
                {(Object.keys(METERING_LABELS) as MeteringType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => { setMeteringType(type); setShowMeterMenu(false); }}
                    className={`w-full px-2 py-1 text-[9px] text-left hover:bg-gray-700 ${
                      meteringType === type ? 'text-cyan-400' : 'text-gray-300'
                    }`}
                  >
                    {METERING_LABELS[type]}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Fader */}
          <div 
            ref={faderRef}
            className={`flex-1 bg-gray-800 rounded relative cursor-ns-resize ${isDragging ? 'cursor-grabbing' : ''}`}
            onMouseDown={handleFaderMouseDown}
          >
            {/* Scale marks */}
            {[0, 25, 50, 75, 100].map(p => (
              <div key={p} className="absolute left-0 right-0 h-px bg-gray-600" style={{ bottom: `${p}%` }} />
            ))}
            {/* Fader handle */}
            <div 
              className="absolute left-0.5 right-0.5 h-3 bg-gray-300 rounded shadow border border-gray-400 transition-all"
              style={{ bottom: `calc(${faderNormalized * 100}% - 6px)` }}
            />
          </div>
        </div>
      </div>

      {/* Close meter menu on click outside */}
      {showMeterMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMeterMenu(false)}
        />
      )}
    </div>
  );
}

export default ChannelStrip;
