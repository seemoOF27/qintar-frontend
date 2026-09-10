/**
 * يولّد `src/styles/tokens.css` من `shared/design-tokens.json`.
 *
 * **مصدر الهوية واحد.** تغييرها لاحقًا تعديل ملف JSON واحد، ويقرأ منه الويب
 * هنا والموبايل عبر `theme.ts` — القسم 13.
 *
 * يعمل قبل كل تشغيل وبناء، فلا يمكن أن يتباعد الملفان.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const tokens = JSON.parse(readFileSync(resolve(here, '../shared/design-tokens.json'), 'utf8'))

const lines = []

const walk = (value, path) => {
  for (const [key, entry] of Object.entries(value)) {
    if (key.startsWith('$')) continue
    const next = [...path, key]
    if (entry !== null && typeof entry === 'object') walk(entry, next)
    else lines.push(`  --${next.join('-')}: ${entry};`)
  }
}

walk(tokens.color, ['color'])
walk(tokens.space, ['space'])
walk(tokens.radius, ['radius'])
walk(tokens.fontSize, ['text'])
lines.push(`  --touch-min: ${tokens.touchTarget.min};`)
lines.push(`  --shadow-raised: ${tokens.shadow.raised};`)

const css = `/* مولَّد من shared/design-tokens.json — لا تعدّله يدويًا. */
@import 'tailwindcss';

@theme {
${lines.join('\n')}
}

:root {
  color-scheme: light;
}

html,
body,
#root {
  min-height: 100dvh;
}

body {
  margin: 0;
  background: var(--color-surface-page);
  color: var(--color-ink-base);
  font-family: system-ui, -apple-system, 'Segoe UI', 'Noto Naskh Arabic', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* الجوال أولًا: لا حقل إدخال دون 16px، وإلا كبّره iOS تلقائيًا عند التركيز. */
input,
select,
textarea,
button {
  font: inherit;
  font-size: max(16px, 1rem);
}
`

mkdirSync(resolve(here, '../src/styles'), { recursive: true })
writeFileSync(resolve(here, '../src/styles/tokens.css'), css)
console.log(`tokens.css ← ${lines.length} توكنًا`)
