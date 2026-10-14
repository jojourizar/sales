# Promo loop

A 10 second looping animation (1080x1350, 30 fps) that shows what Deal Motion Router does, in the MonkeyWeaver brand. Built with Remotion.

```
npm install
npm run fonts     # copies Paul Slab and Jost from the MonkeyWeaver repo (not committed: demo licence)
npm run studio    # preview
npm run render    # out/loop.mp4 for LinkedIn
npm run gif       # out/loop.gif (half size) for the README
npx remotion still Loop out/still.png --frame=245
```

The numbers on the two cards are the engine's own output on `test/fixtures/enterprise-gov.json` and `test/fixtures/smb-single.json`.
