/**
 * MissionReportModal — slides 11, 13, 14, 23.
 *
 * Uses the 1998 game's pre-rendered STRATEGY.DLL mission-report BMPs
 * (10522-10541, 10712+) which include the modal frame + scene art
 * baked together. We overlay the dynamic title + body text on top of
 * the BMP using percentage-anchored positions matched to the BMP's
 * layout.
 */
import { useEffect } from 'react';

export interface MissionReport {
  id: number;
  title: string;
  outcomeText: string;
  bodyText: string;
  characterPortraitId?: number;
  backdropId?: number;
  outcomeColor?: 'success' | 'failure' | 'neutral';
}

interface Props {
  report: MissionReport;
  onClose: () => void;
}

// Scene BMP selection by mission type, IDs from STRATEGY.DLL extraction.
function pickBackdropId(title: string): number {
  const t = title.toLowerCase();
  if (t.includes('battle'))    return 10712;  // X-wing + Mon Cal scene
  if (t.includes('uprising'))  return 10538;  // Mos Eisley alley scene
  if (t.includes('espionage')) return 10536;  // pilot at viewscreen
  if (t.includes('diplomacy') || t.includes('diplomatic')) return 10822;
  return 10522;  // empty space scene
}

export function MissionReportModal({ report, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const outcomeColor =
    report.outcomeColor === 'success' ? '#ffe070' :
    report.outcomeColor === 'failure' ? '#dc5050' :
    '#ffffff';

  const backdropId = report.backdropId ?? pickBackdropId(report.title);
  const backdropUrl = `/assets/sprites/strategy/${backdropId}.png`;

  return (
    <div className="mission-report-modal" onClick={onClose}>
      <div
        className="mission-report-modal__panel"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundImage: `url(${backdropUrl})` }}
      >
        {/* slide_11: title text in navy title bar baked into the BMP.
            We overlay the dynamic title in the same band. */}
        <div className="mission-report-modal__title-overlay">
          {report.title}
        </div>
        <div className="mission-report-modal__nav-overlay">
          <button className="mission-report-modal__nav-btn" title="Previous">▲</button>
          <button className="mission-report-modal__nav-btn" title="Next">▼</button>
          <button className="mission-report-modal__close" onClick={onClose}>×</button>
        </div>

        {/* slide_11: outcome line + body text in the BMP's text region
            (bottom 25% of the BMP is dark-bordered text panel). */}
        <div className="mission-report-modal__text-overlay">
          <div className="mission-report-modal__outcome" style={{ color: outcomeColor }}>
            {report.outcomeText}
          </div>
          <div className="mission-report-modal__body">
            {report.bodyText}
          </div>
        </div>

        <div className="mission-report-modal__hint">
          Press SPACE or ESC to close
        </div>
      </div>
    </div>
  );
}
