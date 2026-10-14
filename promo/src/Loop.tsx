import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, H, TOTAL, W} from './brand';
import {useFonts} from './fonts';

// Timeline, in seconds. The piece loops: frame 0 and the last frame share the
// same empty cards zone, so the cut back to the start is invisible.
const T = {
  card1: 0.4,
  count1: [0.9, 1.9],
  chips: [1.3, 1.55, 1.8],
  card2: 4.4,
  count2: [5.0, 6.0],
  footer: [7.4, 8.0],
  footerOut: [8.6, 9.0],
  exit: [9.0, 9.7],
};

const PAD = 72;
const CARD_H = 206;
const CARD_GAP = 22;
const CARDS_TOP = 744;

const eyebrow: React.CSSProperties = {
  fontFamily: 'Jost',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color: C.wine,
};

type Deal = {
  eyebrow: string;
  title: string;
  verdict: string;
  score: number;
  tone: string;
  chips: string[];
};

const VERONA: Deal = {
  eyebrow: 'Enterprise · €4,000,000 · Proposal sent',
  title: 'State of Verona',
  verdict: 'You are working a large account like a small one.',
  score: 27,
  tone: C.display,
  chips: ['Economic buyer missing', 'Decision process unknown', 'No contact linked'],
};

const BRIGHT: Deal = {
  eyebrow: 'SMB · €18,000 · Discovery done',
  title: 'Bright Fields Ltd',
  verdict: 'On track. Not held to a committee standard, because it does not need one.',
  score: 100,
  tone: C.gold,
  chips: [],
};

const Card: React.FC<{deal: Deal; y: number; enterAt: number; countAt: number[]; chipsAt?: number[]}> = ({
  deal, y, enterAt, countAt, chipsAt,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - enterAt * fps, fps, config: {damping: 200, stiffness: 120}});
  const ty = interpolate(s, [0, 1], [420, 0]);
  const shown = interpolate(frame, countAt.map((v) => v * fps), [0, deal.score], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const barW = 180;
  return (
    <div style={{
      position: 'absolute', left: PAD, right: PAD, top: y, height: CARD_H,
      background: C.white, borderRadius: 4, padding: '26px 30px',
      transform: `translateY(${ty}px)`, opacity: s,
      boxShadow: '0 18px 40px rgba(110,19,32,0.12)',
    }}>
      <div style={eyebrow}>{deal.eyebrow}</div>
      <div style={{
        fontFamily: 'Paul Slab', fontWeight: 400, fontSize: 38, lineHeight: 1, marginTop: 12,
        textTransform: 'uppercase', color: C.wine,
      }}>{deal.title}</div>
      <div style={{
        fontFamily: 'Jost', fontWeight: 300, fontSize: 19, lineHeight: 1.4, marginTop: 12,
        color: C.body, maxWidth: 600,
      }}>{deal.verdict}</div>
      {chipsAt && (
        <div style={{display: 'flex', gap: 10, marginTop: 14}}>
          {deal.chips.map((c, i) => {
            const cs = spring({frame: frame - chipsAt[i] * fps, fps, config: {damping: 200}});
            return (
              <div key={c} style={{
                fontFamily: 'Jost', fontWeight: 500, fontSize: 12, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: C.red, border: `1px solid ${C.red}`,
                padding: '5px 10px', borderRadius: 2, opacity: cs,
                transform: `translateY(${(1 - cs) * 10}px)`,
              }}>{c}</div>
            );
          })}
        </div>
      )}
      <div style={{position: 'absolute', right: 30, top: 22, textAlign: 'right'}}>
        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6}}>
          <span style={{fontFamily: 'Paul Slab', fontWeight: 700, fontSize: 86, lineHeight: 0.94, color: deal.tone}}>
            {Math.round(shown)}
          </span>
          <span style={{fontFamily: 'Jost', fontWeight: 300, fontSize: 22, color: C.body}}>/100</span>
        </div>
        <div style={{width: barW, height: 4, background: C.cream, marginTop: 14, marginLeft: 'auto'}}>
          <div style={{width: (shown / 100) * barW, height: 4, background: deal.tone}} />
        </div>
        <div style={{...eyebrow, fontSize: 11, marginTop: 10}}>ready to close</div>
      </div>
    </div>
  );
};

const Orbits: React.FC = () => {
  const frame = useCurrentFrame();
  const cx = 230;
  const cy = 500;
  const turn = (frame / TOTAL) * 360; // one full turn per loop: seamless
  const radii = [120, 210, 300, 390, 480];
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      {radii.map((r) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={C.wine} strokeOpacity={0.28} strokeWidth={1} />
      ))}
      <g transform={`rotate(${turn} ${cx} ${cy})`}>
        <circle cx={cx + 300} cy={cy} r={7} fill={C.red} />
      </g>
      <g transform={`rotate(${-turn} ${cx} ${cy})`}>
        <circle cx={cx + 480} cy={cy} r={5} fill={C.gold} />
      </g>
      <circle cx={cx} cy={cy} r={28} fill="none" stroke={C.red} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={6} fill={C.red} />
    </svg>
  );
};

// The red thread: the single line that ties the diagnosis to the account.
const Thread: React.FC<{endY: number}> = ({endY}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(frame, [T.card1 * fps + 6, T.card1 * fps + 30], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic),
  });
  const d = `M 230 528 C 230 ${endY - 60}, 560 ${endY - 110}, 620 ${endY - 8}`;
  const len = 640; // longer than the curve, so nothing peeks out before it draws
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <path d={d} fill="none" stroke={C.red} strokeWidth={2} strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
    </svg>
  );
};

export const Loop: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Card 1 slides up to make room when card 2 arrives.
  const shift = spring({frame: frame - T.card2 * fps, fps, config: {damping: 200, stiffness: 120}});
  const card1Y = CARDS_TOP + (CARD_H + CARD_GAP) * 0.5 * (1 - shift);
  const card2Y = CARDS_TOP + CARD_H + CARD_GAP;

  const footerIn = interpolate(frame, T.footer.map((v) => v * fps), [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const footerOut = interpolate(frame, T.footerOut.map((v) => v * fps), [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const footerO = footerIn * footerOut;

  const exit = interpolate(frame, T.exit.map((v) => v * fps), [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{background: C.coral}}>
      <Orbits />

      {/* Top bar */}
      <div style={{position: 'absolute', left: PAD, top: PAD, display: 'flex', alignItems: 'center', gap: 18}}>
        <Img src={staticFile('brand/batz-red.svg')} style={{height: 76}} />
        <div>
          <div style={{fontFamily: 'Jost', fontWeight: 600, fontSize: 20, color: C.wine}}>Claude Code + Pipedrive</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 4}}>
            <span style={{width: 8, height: 8, borderRadius: 4, background: C.gold, display: 'inline-block'}} />
            <span style={{fontFamily: 'Jost', fontWeight: 300, fontSize: 16, color: C.wine}}>read only · configured in one conversation</span>
          </div>
        </div>
      </div>
      <Img src={staticFile('brand/wordmark-red.svg')} style={{position: 'absolute', right: PAD, top: PAD - 6, height: 86}} />
      <div style={{position: 'absolute', left: PAD, right: PAD, top: 190, height: 1, background: C.wine, opacity: 0.35}} />

      {/* Headline */}
      <div style={{
        position: 'absolute', right: PAD, top: 412, width: 820, textAlign: 'right',
        fontFamily: 'Paul Slab', fontWeight: 700, fontSize: 72, lineHeight: 0.94,
        textTransform: 'uppercase', color: C.wine, whiteSpace: 'pre-line',
      }}>
        {'Which deals\nare you working\nat the wrong size?'}
      </div>
      <div style={{...eyebrow, position: 'absolute', right: PAD, top: 656, textAlign: 'right'}}>
        Deal Motion Router · open source
      </div>
      <div style={{position: 'absolute', left: PAD, right: PAD, top: 704, height: 1, background: C.wine, opacity: 0.35}} />

      {/* Cards zone, exits as a block for the loop */}
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${exit * 160}px)`, opacity: 1 - exit}}>
        <Thread endY={card1Y} />
        <Card deal={VERONA} y={card1Y} enterAt={T.card1} countAt={T.count1} chipsAt={T.chips} />
        <Card deal={BRIGHT} y={card2Y} enterAt={T.card2} countAt={T.count2} />
      </div>

      {/* Footer */}
      <div style={{position: 'absolute', left: PAD, right: PAD, bottom: PAD, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: footerO}}>
        <div style={eyebrow}>Same engine · same day · same pipeline</div>
        <div style={{fontFamily: 'Jost', fontWeight: 300, fontSize: 18, color: C.wine}}>github.com/jojourizar/sales</div>
      </div>
    </AbsoluteFill>
  );
};
