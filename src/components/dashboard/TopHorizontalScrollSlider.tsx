import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react';

export interface HorizontalScrollSliderProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  label?: string;
  position?: 'top' | 'bottom';
}

export function HorizontalScrollSlider({ 
  targetRef, 
  className = '', 
  label,
  position = 'top'
}: HorizontalScrollSliderProps) {
  const [scrollInfo, setScrollInfo] = useState({
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
    canScrollLeft: false,
    canScrollRight: false,
    hasOverflow: false,
    progress: 0 // 0 to 100
  });

  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  // Update scroll metrics from targetRef
  const updateMetrics = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;

    const scrollLeft = el.scrollLeft;
    const scrollWidth = el.scrollWidth;
    const clientWidth = el.clientWidth;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    const hasOverflow = maxScroll > 2;
    const canScrollLeft = scrollLeft > 3;
    const canScrollRight = scrollLeft < maxScroll - 3;
    const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;

    setScrollInfo({
      scrollLeft,
      scrollWidth,
      clientWidth,
      canScrollLeft,
      canScrollRight,
      hasOverflow,
      progress
    });

    // Also sync the native scroll track if present
    if (scrollTrackRef.current && !isSyncingRef.current) {
      isSyncingRef.current = true;
      scrollTrackRef.current.scrollLeft = scrollLeft;
      setTimeout(() => { isSyncingRef.current = false; }, 20);
    }
  }, [targetRef]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    updateMetrics();

    const handleScroll = () => {
      if (isSyncingRef.current) return;
      updateMetrics();
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateMetrics);

    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });
    resizeObserver.observe(el);

    // Initial check after short delays to catch table content render
    const t1 = setTimeout(updateMetrics, 50);
    const t2 = setTimeout(updateMetrics, 250);
    const t3 = setTimeout(updateMetrics, 600);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateMetrics);
      resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [targetRef, updateMetrics]);

  // Handle native track scroll
  const handleTrackScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!targetRef.current || isSyncingRef.current) return;
    isSyncingRef.current = true;
    targetRef.current.scrollLeft = e.currentTarget.scrollLeft;
    updateMetrics();
    setTimeout(() => { isSyncingRef.current = false; }, 20);
  };

  // Handle range slider drag
  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = targetRef.current;
    if (!el) return;
    const val = Number(e.target.value);
    const maxScroll = el.scrollWidth - el.clientWidth;
    const newScrollLeft = (val / 100) * maxScroll;
    el.scrollLeft = newScrollLeft;
    updateMetrics();
  };

  // Step scroll left/right
  const scrollStep = (direction: 'left' | 'right') => {
    const el = targetRef.current;
    if (!el) return;
    const step = Math.max(160, el.clientWidth * 0.4);
    el.scrollBy({
      left: direction === 'right' ? step : -step,
      behavior: 'smooth'
    });
  };

  if (!scrollInfo.hasOverflow) {
    return null;
  }

  const defaultLabel = position === 'top' ? 'Table Slider (Top)' : 'Table Slider (Bottom)';
  const displayLabel = label || defaultLabel;

  return (
    <div 
      className={`w-full bg-slate-50/95 px-4 py-2.5 flex flex-col gap-2 select-none shadow-2xs transition-all ${
        position === 'top' 
          ? 'border-b border-slate-200/80' 
          : 'border-t border-slate-200/80'
      } ${className}`}
    >
      {/* Slider & Quick Navigation Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
            <ArrowLeftRight size={13} className="text-blue-600 shrink-0" />
            <span className="hidden sm:inline">{displayLabel}</span>
            <span className="sm:hidden">Scroll Table</span>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">
            Slide horizontal to view all columns
          </span>
        </div>

        {/* Interactive Slider in the middle */}
        <div className="flex-1 flex items-center gap-2.5 min-w-[180px] max-w-md mx-auto">
          <button
            type="button"
            onClick={() => scrollStep('left')}
            disabled={!scrollInfo.canScrollLeft}
            className="p-1 rounded-md text-slate-700 hover:text-blue-600 hover:bg-slate-200/70 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer shrink-0"
            title="Slide table left"
            aria-label="Slide table left"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(scrollInfo.progress)}
              onChange={handleRangeChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-ew-resize accent-blue-600 focus:outline-none"
              title="Drag slider to view hidden table columns"
            />
          </div>

          <button
            type="button"
            onClick={() => scrollStep('right')}
            disabled={!scrollInfo.canScrollRight}
            className="p-1 rounded-md text-slate-700 hover:text-blue-600 hover:bg-slate-200/70 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer shrink-0"
            title="Slide table right"
            aria-label="Slide table right"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Percentage badge / status */}
        <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-semibold text-slate-600">
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70 font-mono text-[10px]">
            {Math.round(scrollInfo.progress)}%
          </span>
          {scrollInfo.canScrollRight ? (
            <span className="text-blue-600 font-medium text-[10px] hidden md:inline">
              More to right →
            </span>
          ) : (
            <span className="text-slate-400 font-medium text-[10px] hidden md:inline">
              End reached
            </span>
          )}
        </div>
      </div>

      {/* Synchronized Scrollbar Track */}
      <div 
        ref={scrollTrackRef}
        onScroll={handleTrackScroll}
        className="w-full overflow-x-auto h-2 bg-slate-200/60 rounded-full cursor-pointer"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div style={{ width: `${scrollInfo.scrollWidth}px`, height: '1px' }} />
      </div>
    </div>
  );
}

// Retain alias for existing imports
export const TopHorizontalScrollSlider = HorizontalScrollSlider;
