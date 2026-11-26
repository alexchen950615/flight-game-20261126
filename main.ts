// Skyline Courier — the hand-in program (Node 22, standard library only).
// It copies this repository's game/ and screenshots/ into the output
// directory the grader provides and writes /output/dossier.json, the summary
// the judge reads, using the vendored make.fun library. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps mirror the sealed scorer's own limits, so a hand-in this program
// accepts is one the gate accepts: at most 4 screenshots, none over 256 KiB;
// at most 993 files and 48 MiB under game/; paths under game/ at most 1000
// bytes; the dossier text capped at 160 KiB.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// A one-line receipt on stdout so a local run shows what landed; it writes
// nothing to /output, so the two grader runs stay byte-identical.
console.log(`Skyline Courier handed in: game/ + screenshots/ + dossier.json (${dossier.length} bytes) -> ${out}`);
