import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(100);
// CRF is passed on the mp4 render only: the gif codec rejects it.
