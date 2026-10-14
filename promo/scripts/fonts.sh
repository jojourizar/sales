#!/bin/sh
# Paul Slab is a demo licence: it is NOT committed to this public repo.
# Copy it from the MonkeyWeaver repo before rendering.
set -e
cd "$(dirname "$0")/.."
mkdir -p public/fonts
cp ../../monkey-weaver/assets/fonts/paulslab-bold.otf ../../monkey-weaver/assets/fonts/paulslab-regular.otf ../../monkey-weaver/assets/fonts/jost.ttf public/fonts/
echo "fonts copied"
