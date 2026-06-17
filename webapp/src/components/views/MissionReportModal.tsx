/**
 * MissionReportModal — full-screen result screen for completed missions,
 * battles, story events.  Matches slides 11 (Espionage), 13/14 (Incite
 * Uprising), 23 (Battle outcome) of the 1998 game.
 *
 * Layout: dark cockpit window with cinematic backdrop image, character
 * portrait inset on the right, title at top, body text at bottom, X
 * close button top-right.
 */
import { useEffect } from 'react';

export interface MissionReport {
  id: number;
  title: string;          // 'Espionage Mission Report' / 'Battle at Xyquine'
  outcomeText: string;    // 'The Imperial fleet is victorious.'
  bodyText: string;       // longer paragraph
  characterPortraitId?: number;  // GOKRES.DLL portrait BMP id
  backdropId?: string;            // cinematic image (e.g. 'mission-bg.png')
  outcomeColor?: 'success' | 'failure' | 'neutral';
}

interface Props {
  report: MissionReport;
  onClose: () => void;
}

export function MissionReportModal({ report, onClose }: Props) {
  // Esc to dismiss
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
    '#c0c0c0';

  // Pick a backdrop: cutscene fallback or color
  const backdropUrl = report.backdropId
    ? `/assets/sprites/encyclopedia/${report.backdropId}`
    : null;

  return (
    <div className="mission-report-modal" onClick={onClose}>
      <div className="mission-report-modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="mission-report-modal__titlebar">
          <span className="mission-report-modal__title">{report.title}</span>
          {/* slide_11: up/down arrows to cycle pending reports.
              X close on far right. */}
          <div className="mission-report-modal__nav">
            <button className="mission-report-modal__nav-btn" title="Previous">▲</button>
            <button className="mission-report-modal__nav-btn" title="Next">▼</button>
            <button className="mission-report-modal__close" onClick={onClose}>×</button>
          </div>
        </div>
        <div
          className="mission-report-modal__backdrop"
          style={backdropUrl ? { backgroundImage: `url(${backdropUrl})` } : undefined}
        >
          {report.characterPortraitId != null && (
            <img
              className="mission-report-modal__portrait"
              src={`/assets/sprites/gokres/${report.characterPortraitId}.png`}
              alt="character"
              onError={(e) => {
                // Hide if portrait missing
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>
        <div className="mission-report-modal__textblock">
          <div
            className="mission-report-modal__outcome"
            style={{ color: outcomeColor }}
          >
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
