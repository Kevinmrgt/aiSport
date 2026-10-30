import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '../../..');
const baseURL = process.env.E2E_BASE_URL ?? 'https://ai-sport-web.vercel.app';
const storagePath = resolve(
  process.cwd(),
  process.env.PLAYWRIGHT_AUTH_STORAGE ?? 'playwright/.auth/google-e2e.json',
);
const samplingPath = resolve(
  repositoryRoot,
  'tmp/accessibility-final/contrast/contrast-review-sampling.json',
);
const outputPath = resolve(
  repositoryRoot,
  'tmp/accessibility-final/contrast/contrast-composite-sampling.json',
);

if (!existsSync(storagePath)) throw new Error(`Session OAuth locale absente : ${storagePath}`);
if (!existsSync(samplingPath)) {
  throw new Error(
    `Liste de controle absente : ${samplingPath}. Executer d'abord rncp-a11y-contrast-sampling.ps1.`,
  );
}

const source = JSON.parse(readFileSync(samplingPath, 'utf8').replace(/^\uFEFF/, ''));
const samples = source.samples ?? [];
const contextsByRoute = new Map();

for (const sample of samples) {
  const contexts = Array.isArray(sample.contexts) ? sample.contexts : [sample.contexts];
  for (const context of contexts) {
    const entries = contextsByRoute.get(context.route) ?? [];
    entries.push({
      id: sample.id,
      expectedContrast: Number.parseFloat(sample.expectedContrast),
      selector: context.selector,
    });
    contextsByRoute.set(context.route, entries);
  }
}

const browser = await chromium.launch({ headless: true });
const contextResults = [];

try {
  const context = await browser.newContext({
    baseURL,
    storageState: storagePath,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  for (const [route, entries] of contextsByRoute) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    if (!response?.ok()) throw new Error(`${route} : reponse HTTP invalide.`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    if (new URL(page.url()).pathname !== route)
      throw new Error(`${route} : redirection inattendue.`);

    for (const entry of entries) {
      const locator = page.locator(entry.selector).first();
      if ((await locator.count()) === 0 || !(await locator.isVisible())) {
        contextResults.push({
          ...entry,
          route,
          status: 'human_review_required',
          reason: 'element_absent_or_hidden',
        });
        continue;
      }

      const originalStyle = await locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          color: style.color,
          inlineColor: element.style.getPropertyValue('color'),
          inlineColorPriority: element.style.getPropertyPriority('color'),
          inlineTextFill: element.style.getPropertyValue('-webkit-text-fill-color'),
          inlineTextFillPriority: element.style.getPropertyPriority('-webkit-text-fill-color'),
          inlineTextShadow: element.style.getPropertyValue('text-shadow'),
          inlineTextShadowPriority: element.style.getPropertyPriority('text-shadow'),
        };
      });

      const before = await locator.screenshot({ animations: 'disabled' });
      await locator.evaluate((element) => {
        element.style.setProperty('color', 'transparent', 'important');
        element.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
        element.style.setProperty('text-shadow', 'none', 'important');
      });
      const backdrop = await locator.screenshot({ animations: 'disabled' });
      await locator.evaluate((element, saved) => {
        const restore = (property, value, priority) => {
          if (value) element.style.setProperty(property, value, priority);
          else element.style.removeProperty(property);
        };
        restore('color', saved.inlineColor, saved.inlineColorPriority);
        restore('-webkit-text-fill-color', saved.inlineTextFill, saved.inlineTextFillPriority);
        restore('text-shadow', saved.inlineTextShadow, saved.inlineTextShadowPriority);
      }, originalStyle);

      const measurement = await page.evaluate(
        async ({ beforeBase64, backdropBase64, color }) => {
          const decode = async (base64) => {
            const image = new Image();
            image.src = `data:image/png;base64,${base64}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const drawing = canvas.getContext('2d', { willReadFrequently: true });
            if (!drawing) throw new Error('Canvas 2D indisponible.');
            drawing.drawImage(image, 0, 0);
            return {
              width: canvas.width,
              height: canvas.height,
              pixels: drawing.getImageData(0, 0, canvas.width, canvas.height).data,
            };
          };
          const parseColor = (value) => {
            const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
            if (channels.length < 3) return null;
            return [channels[0], channels[1], channels[2], channels[3] ?? 1];
          };
          const luminance = ([red, green, blue]) => {
            const linear = [red, green, blue].map((channel) => {
              const value = channel / 255;
              return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
          };
          const contrast = (first, second) => {
            const firstLuminance = luminance(first);
            const secondLuminance = luminance(second);
            return (
              (Math.max(firstLuminance, secondLuminance) + 0.05) /
              (Math.min(firstLuminance, secondLuminance) + 0.05)
            );
          };

          const foreground = parseColor(color);
          if (!foreground) return { reason: 'foreground_color_unreadable' };
          const first = await decode(beforeBase64);
          const second = await decode(backdropBase64);
          if (first.width !== second.width || first.height !== second.height) {
            return { reason: 'screenshot_dimensions_changed' };
          }

          const ratios = [];
          for (let offset = 0; offset < first.pixels.length; offset += 4) {
            const difference =
              Math.abs(first.pixels[offset] - second.pixels[offset]) +
              Math.abs(first.pixels[offset + 1] - second.pixels[offset + 1]) +
              Math.abs(first.pixels[offset + 2] - second.pixels[offset + 2]);
            if (difference < 24) continue;

            const background = [
              second.pixels[offset],
              second.pixels[offset + 1],
              second.pixels[offset + 2],
            ];
            const alpha = foreground[3];
            const compositedForeground = foreground
              .slice(0, 3)
              .map((channel, index) => channel * alpha + background[index] * (1 - alpha));
            ratios.push(contrast(compositedForeground, background));
          }

          if (ratios.length < 5) {
            return { reason: 'insufficient_changed_pixels', changedPixels: ratios.length };
          }
          ratios.sort((left, right) => left - right);
          return {
            changedPixels: ratios.length,
            minimumRatio: ratios[0],
            percentile05Ratio: ratios[Math.floor((ratios.length - 1) * 0.05)],
            medianRatio: ratios[Math.floor((ratios.length - 1) * 0.5)],
          };
        },
        {
          beforeBase64: before.toString('base64'),
          backdropBase64: backdrop.toString('base64'),
          color: originalStyle.color,
        },
      );

      const status =
        typeof measurement.percentile05Ratio !== 'number'
          ? 'human_review_required'
          : measurement.percentile05Ratio + 0.05 >= entry.expectedContrast
            ? 'automated_sampling_pass'
            : 'potential_failure';
      contextResults.push({ ...entry, route, status, ...measurement });
    }
  }
} finally {
  await browser.close();
}

const signatureResults = samples.map((sample) => {
  const contexts = contextResults.filter(({ id }) => id === sample.id);
  let status = 'automated_sampling_pass';
  if (contexts.some((context) => context.status === 'potential_failure'))
    status = 'potential_failure';
  else if (contexts.some((context) => context.status === 'human_review_required')) {
    status = 'human_review_required';
  }
  return {
    id: sample.id,
    priority: sample.priority,
    cause: sample.cause,
    expectedContrast: sample.expectedContrast,
    status,
    contexts,
  };
});

const countByStatus = (items) =>
  items.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});

const report = {
  executedAt: new Date().toISOString(),
  baseURL,
  browser: browser.version(),
  method:
    'Echantillonnage automatise des pixels de fond sous les glyphes, par comparaison avant/apres transparence du texte.',
  limitation:
    "Ce controle cible les alertes et ne remplace ni une mesure manuelle du pixel le plus defavorable, ni l'audit RGAA.",
  privacy:
    'Captures traitees uniquement en memoire ; aucune capture, cookie ou identite persistee.',
  summary: {
    sourceSignatures: samples.length,
    sourceContexts: contextResults.length,
    signatureStatuses: countByStatus(signatureResults),
    contextStatuses: countByStatus(contextResults),
  },
  signatures: signatureResults,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.info(JSON.stringify(report.summary, null, 2));
console.info(`Rapport : ${outputPath}`);
