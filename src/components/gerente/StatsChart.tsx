'use client';

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export type ChartType = 'area' | 'bar';

interface StatsChartProps {
  data: any[];
  xDataKey: string;
  yDataKey: string;
  color?: string;
  type?: ChartType;
  title?: string;
  valueFormatter?: (value: number) => string;
}

const defaultFormatter = (val: number) => `${val}`;

export function StatsChart({ 
  data, 
  xDataKey, 
  yDataKey, 
  color = '#FFD700', // primary yellow / gold
  type = 'area',
  title,
  valueFormatter = defaultFormatter
}: StatsChartProps) {
  
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/95 border-l-2 border-primary/40 border-r border-y border-white/5 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-1.5 border-b border-white/5 pb-1">
             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
             <p className="text-[9px] text-gray-400 uppercase font-mono tracking-widest">{label}</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-black font-display tracking-tighter" style={{ color }}>
              {valueFormatter(payload[0].value)}
            </p>
            <span className="text-[8px] text-gray-500 uppercase font-mono">STATUS_ESTABLE</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col group/chart">
      {title && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1 text-[10px] uppercase font-black tracking-[0.2em]">
            <div className="flex items-center gap-2">
               <div className="w-1 h-3 bg-primary/40" />
               <h3 className="text-white group-hover/chart:text-primary transition-colors">
                 {title}
               </h3>
            </div>
            <span className="text-gray-600 font-mono text-[8px] group-hover/chart:text-primary/50 transition-colors">RADAR_SEQ_09</span>
          </div>
          <div className="h-[1px] w-full bg-gradient-to-r from-primary/30 via-primary/5 to-transparent" />
        </div>
      )}
      <div className="flex-1 w-full min-h-[160px]">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            {type === 'area' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id={`glow-${yDataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4}/>
                    <stop offset="40%" stopColor={color} stopOpacity={0.1}/>
                    <stop offset="100%" stopColor={color} stopOpacity={0.0}/>
                  </linearGradient>
                  <filter id="shadow" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                    <feOffset in="blur" dx="0" dy="2" result="offsetBlur" />
                    <feFlood floodColor={color} floodOpacity="0.5" result="offsetColor" />
                    <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur" />
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey={xDataKey} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#444', fontFamily: 'monospace', fontWeight: 700 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#444', fontFamily: 'monospace' }}
                  tickFormatter={(val) => `${val}`.replace(/[^0-9]/g, '')}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ stroke: 'rgba(255,215,0,0.2)', strokeWidth: 1, strokeDasharray: '5 5' }} 
                  animationDuration={300}
                />
                <Area 
                  type="monotone" 
                  dataKey={yDataKey} 
                  stroke={color} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill={`url(#glow-${yDataKey})`}
                  activeDot={{ r: 5, fill: '#000', stroke: color, strokeWidth: 2, className: "animate-pulse" }}
                  animationDuration={1500}
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey={xDataKey} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#444', fontFamily: 'monospace' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#444', fontFamily: 'monospace' }}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} 
                />
                <Bar 
                  dataKey={yDataKey} 
                  radius={[1, 1, 0, 0]}
                  animationDuration={1000}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry[yDataKey] > 20 ? '#ef4444' : color} 
                      fillOpacity={0.8}
                      className="hover:fill-opacity-100 transition-all cursor-crosshair"
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
