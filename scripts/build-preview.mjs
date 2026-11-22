import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';

const temporary = await mkdtemp(join(tmpdir(), 'krmu-file-preview-'));
try {
  await build({
    build: {
      outDir: temporary,
      copyPublicDir: false,
      modulePreload: false,
      cssCodeSplit: false,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      chunkSizeWarningLimit: 1000,
      rolldownOptions: { output: { codeSplitting: false } },
    },
  });

  const source = await readFile(join(temporary, 'index.html'), 'utf8');
  const scriptTag = source.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/);
  const styleTag = source.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/);
  if (!scriptTag || !styleTag) throw new Error('Expected one bundled script and stylesheet.');
  const [js, rawCss, aerial, icon] = await Promise.all([
    readFile(join(temporary, scriptTag[1]), 'utf8'),
    readFile(join(temporary, styleTag[1]), 'utf8'),
    readFile(new URL('../public/assets/campus-aerial.jpg', import.meta.url)),
    readFile(new URL('../public/favicon.svg', import.meta.url)),
  ]);
  const css = rawCss.replaceAll('/assets/campus-aerial.jpg', `data:image/jpeg;base64,${aerial.toString('base64')}`);
  const preview = source
    .replace(scriptTag[0], () => `<script type="module">\n${js.replaceAll('</script', '<\\/script')}\n</script>`)
    .replace(styleTag[0], () => `<style>\n${css}\n</style>`)
    .replace('/favicon.svg', `data:image/svg+xml;base64,${icon.toString('base64')}`);
  await writeFile(new URL('../KRMU-Campus-Preview.html', import.meta.url), preview);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
