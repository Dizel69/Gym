# Third-party notices

openGym — Copyright (C) 2026 Duarte Santos.
openGym's own code is licensed under the **GNU AGPL v3.0** (see [LICENSE](LICENSE)).

## App store exception

As an additional permission under section 7 of the AGPL v3.0, the copyright holder permits
distribution of the openGym mobile application through app store platforms (such as the
Apple App Store and Google Play) whose terms of service would otherwise be incompatible
with the AGPL, provided the corresponding source code remains available under the AGPL at
the project repository. This permission applies to the distribution channel only and does
not otherwise limit the license.

## Body diagram geometry

The muscle outlines the body maps are drawn from (`frontend/src/lib/body-paths.js`) are derived
from [**MuscleMap**](https://github.com/melihcolpan/MuscleMap) by Melih Colpan, used under the
**MIT License** and reproduced below. MuscleMap ships its path data as Swift source rather than
`.svg` files; the paths were converted to a JSON module, its sub-group shapes were dropped, and
nothing else about the artwork was changed.

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Exercise data & media

The catalogue (5,632 exercises, English names and steps, Russian names) comes from
[openGym](https://github.com/DuarteSantos8/openGym) v1.4.4 and is covered by the AGPL with the
rest of this program. Every exercise that this fork already had keeps its id, so a logged
workout still points at the same movement.

The stills and loops are a different matter. They are **not** covered by the AGPL.

### Metadata & instruction text

English names, muscles and steps live in `frontend/src/lib/exercises-data.js` and
`frontend/src/instr/`. Russian names for the exercises this fork already had stay as they
were; names for the exercises added from v1.4.4 come from that release. The steps for those
new exercises are still English until a Russian translation exists, and the exercise screen
says so.

### Images & animations — third-party, not AGPL

The exercise stills and loops are **© [Gym visual](https://gymvisual.com/)** (Aliaksandr
Makatserchyk). openGym's own notice licenses them for use in openGym only. They are not
covered by the AGPL, and this fork does not relicense them.

**This repository does not contain them.** `docker compose up` downloads them once into
`media/` from the openGym v1.4.4 catalogue (`scripts/fetch-media.sh`). They are not in git
and not in the published images. About 900 exercises also have a second drawing, on a
female figure; Settings → body chooses which one you see, and that choice never changes a
logged exercise.

If you want to reuse the pictures outside this app, commercially or not, **clear it with
Gym visual first**.

## Gym check-in QR codes

The gym check-in feature (a saved membership code shown as a QR code on the phone, added by
typing, importing a photo, or scanning with the camera) uses three third-party packages. All are
permissively licensed and compatible with openGym's AGPL, and all load on demand: the QR renderer
and the browser decoder only when a card is shown or scanned, the ML Kit plugin only in the
Android/iOS app.

### QR/barcode rendering — `lean-qr`

openGym renders each saved code on the phone with [**lean-qr**](https://github.com/davidje13/lean-qr)
by David Evans, used under the **MIT License** and reproduced below. Only the code's stored value
is kept; the picture is generated fresh from that value each time it is shown, never stored.
It runs the same way in the app and in the browser/PWA.

```
MIT License

Copyright (c) 2021-2025 David Evans

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Camera scan & photo decode in the browser — `jsQR`

In a browser (including the installed PWA), reading a code from the camera or from an imported
photo uses [**jsQR**](https://github.com/cozmo/jsQR) by Cosmo Wolfe, under the **Apache License
2.0** (text at <https://www.apache.org/licenses/LICENSE-2.0> and in the package's own `LICENSE`).
Where the browser has a native `BarcodeDetector`, that is tried first and jsQR is the fallback.
Video frames are decoded in memory and never uploaded or stored.

### Camera scan & photo decode in the app — `@capacitor-mlkit/barcode-scanning`

In the Android/iOS app, reading a code — from the camera or from an imported photo — uses the
[**@capacitor-mlkit/barcode-scanning**](https://github.com/capawesome-team/capacitor-mlkit) plugin
by the Capawesome Team (Robin Genz), a Capacitor wrapper around Google's ML Kit, used under the
**Apache License 2.0**. openGym pins the `7.x` line to stay on Capacitor 7. The full license text is
available at <https://www.apache.org/licenses/LICENSE-2.0> and in the package's own `LICENSE` file.
The decoded string is what openGym keeps; the photo itself is never stored.
