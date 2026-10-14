import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

// Paul Slab lives outside the repo (demo licence): run `npm run fonts` first.
const faces: Array<[string, string, string]> = [
  ['Paul Slab', 'fonts/paulslab-bold.otf', '700'],
  ['Paul Slab', 'fonts/paulslab-regular.otf', '400'],
  ['Jost', 'fonts/jost.ttf', '100 900'],
];

let pending: Promise<void> | null = null;
const loadAll = () => {
  if (!pending) {
    pending = Promise.all(
      faces.map(async ([family, path, weight]) => {
        const face = new FontFace(family, `url(${staticFile(path)})`, {weight});
        await face.load();
        document.fonts.add(face);
      }),
    ).then(() => undefined);
  }
  return pending;
};

export const useFonts = () => {
  const [handle] = useState(() => delayRender('brand fonts'));
  useEffect(() => {
    loadAll().then(() => continueRender(handle));
  }, [handle]);
};
