#!/usr/bin/env node
/**
 * Build version history: one commit = one version.
 * Feature → bump minor, set patch=0. Patch → bump patch.
 * No skipped minors. Chronological order (oldest first) then we output newest-first.
 */
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const log = execSync(
  'git log --reverse --format="%ad|%s" --date=short',
  { encoding: 'utf-8', cwd: root }
).trim().split('\n');

// Keywords: feature = new capability; patch = fix/polish/refactor/cleanup
function isFeature(subject) {
  const s = subject.toLowerCase();
  const featurePatterns = [
    /^add(ed)?\s/, /^implement(ed)?\s/, /^started on\s/, /^integrate(d)?\s/,
    /\b(new|added)\s+(section|feature|flow|page|form|integration|api)\b/,
    /\b(read more|read less|similar dive shops|carousel)\b/, /\b(dark mode|theme toggle)\b/,
    /\b(booking form|booking drawer|booking flow)\b/, /\b(netlify preset|resend api)\b/,
    /\b(loading screen|search feature|chat functionality)\b/, /\b(container queries)\b/,
    /\b(profile page|draft saving|selectable options)\b/, /\b(dive shop selection|rental gear selection)\b/,
    /\b(pre-fill|pre-filling)\b/, /\b(dynamic dive site loading)\b/, /\b(extract dive shop names)\b/,
    /\b(height and weight|feet and inches|date validation|demo mode)\b/,
    /\b(trip and diver (information )?sections)\b/, /\b(mobile menu)\b/, /\b(auto-scroll)\b/,
    /\b(cardsearchresult and search)\b/, /\b(pagination options)\b/, /\b(profile diver options)\b/,
    /\b(search cache.*booking)\b/, /\b(diver management)\b/, /\b(reusable components)\b/,
    /\b(sidebar navigation.*search)\b/, /\b(viewport meta)\b/
  ];
  const patchPatterns = [
    /^refactor/, /^update(d)?\s+(layout|style|color|padding|height|icon|button)/,
    /^improve(d)?\s/, /^enhance(d)?\s+(layout|visibility|responsiveness)/,
    /^remove(d)?\s/, /^adjust(ed)?\s/, /^fix(ed)?\s/, /^sync\s/, /^improve\s/,
    /\b(truncation|overflow|styling|border|gap|background)\b/,
    /\b(documentation|documentation|environment setup)\b/, /\b(error handling|time formatting)\b/,
    /\b(conditional rendering)\b/, /\b(user preferences)\b/, /\b(csv files?)\b/,
    /\b(prompts and query|query handling)\b/, /\b(header overflow|label for clarity)\b/,
    /\b(configuration|config)\b/, /\b(logo|svg assets)\b/, /\b(theme (initialization|handling|hydration))\b/,
    /\b(publish directory|redirect)\b/, /\b(shop detail component|cardinfo|diveshopdetail)\b/,
    /\b(layout and input area|booking flow management)\b/
  ];
  if (featurePatterns.some(p => p.test(s))) return true;
  if (patchPatterns.some(p => p.test(s))) return false;
  // Default: "Enhance X" / "Update X" without clear new capability → patch
  if (/\b(enhanced?|updated?|improved?)\b/.test(s)) return false;
  return false;
}

let minor = 0;
let patch = 0;
const entries = [];

for (const line of log) {
  const [date, subject] = line.split('|');
  const feature = isFeature(subject);
  if (minor === 0) {
    minor = 1;
    patch = feature ? 0 : 1;
  } else {
    if (feature) {
      minor++;
      patch = 0;
    } else {
      patch++;
    }
  }
  const ver = `0.${minor}.${patch}`;
  entries.push({ ver, date, subject });
}

// Output newest-first for README
const out = entries
  .slice()
  .reverse()
  .map(({ ver, date, subject }) => `- **${ver}** — ${subject} (${date}).`)
  .join('\n');

console.log('*(One version per commit, chronological. Feature = minor bump; patch = patch bump. Newest first.)*\n');
console.log(out);
console.log('\n- **0.1.0** — Initial Nuxt minimal starter.');
console.log('\nLatest version:', entries[entries.length - 1].ver);
