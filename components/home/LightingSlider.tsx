import type { CSSProperties } from "react";

export function LightingSlider({ id, label, english, value, min, max, step, display, onChange }: {
  id: string; label: string; english?: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void;
}) {
  return <div className="light-slider"><div className="light-slider-label"><label htmlFor={`dream-${id}`}>{label}{english && <small>{english}</small>}</label><output htmlFor={`dream-${id}`}>{display}</output></div><input id={`dream-${id}`} type="range" min={min} max={max} step={step} value={value} aria-valuetext={display} style={{ "--range-fill": `${(value-min)/(max-min)*100}%` } as CSSProperties} onChange={event => onChange(Number(event.target.value))} /></div>;
}
