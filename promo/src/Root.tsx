import {Composition} from 'remotion';
import {Loop} from './Loop';
import {FPS, H, TOTAL, W} from './brand';

export const Root = () => (
  <Composition id="Loop" component={Loop} fps={FPS} durationInFrames={TOTAL} width={W} height={H} />
);
