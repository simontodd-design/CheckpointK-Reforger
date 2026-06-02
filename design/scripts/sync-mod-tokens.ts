#!/usr/bin/env bun
/**
 * sync-mod-tokens
 * ────────────────────────────────────────────────────────────────────────
 * Propagates design tokens (colors, typography) from design/tokens/ into
 * Reforger mod .layout files. Run via `bun run design:sync`.
 *
 * Status: Phase 0 scaffold. Real implementation lands in Phase 1 when
 * the first .layout files exist. For now, this script:
 *   - Validates the token JSON
 *   - Logs what it WOULD rewrite
 *   - Exits 0 on success
 *
 * Workbench .layout files are an XML-ish format with widget attributes
 * including Color="r,g,b,a" tuples. The Phase 1 implementation will:
 *   1. Parse each .layout file under mod/CheckpointK_Mod/UI/Layouts/
 *   2. Find attributes tagged with a token reference (e.g. via a leading
 *      comment marker `<!-- token: surface.base -->`)
 *   3. Rewrite the hex value or RGBA from the current token JSON
 *   4. Write back with stable formatting (preserve existing whitespace)
 *
 * The CI check `design:check` runs this in --dry-run mode and fails if
 * any drift exists.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface ColorTokens {
  raw: Record<string, string>;
  semantic: Record<string, Record<string, string>>;
}

interface TypographyTokens {
  fontFamily: Record<string, string>;
  fontWeight: Record<string, number>;
  fontSize: Record<string, string>;
}

function loadTokens<T>(file: string): T {
  const path = resolve(import.meta.dir, '..', 'tokens', file);
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as T;
}

function resolveRef(value: string, raw: Record<string, string>): string {
  const match = value.match(/^\{raw\.(.+)\}$/);
  if (!match) return value;
  const key = match[1];
  if (!key || !(key in raw)) throw new Error(`Unknown raw color ref: ${value}`);
  return raw[key]!;
}

function main() {
  const colors = loadTokens<ColorTokens>('colors.json');
  const typography = loadTokens<TypographyTokens>('typography.json');

  console.log('[design:sync] tokens loaded');
  console.log(`  raw colors:      ${Object.keys(colors.raw).length}`);
  console.log(`  semantic groups: ${Object.keys(colors.semantic).length}`);
  console.log(`  font families:   ${Object.keys(typography.fontFamily).length}`);

  // Validate semantic references resolve
  let resolved = 0;
  for (const [group, entries] of Object.entries(colors.semantic)) {
    for (const [name, value] of Object.entries(entries)) {
      const final = resolveRef(value, colors.raw);
      if (!final.match(/^#[0-9A-Fa-f]{6}$/)) {
        console.error(`[design:sync] invalid resolution: ${group}.${name} = ${final}`);
        process.exit(1);
      }
      resolved += 1;
    }
  }
  console.log(`  resolved semantic colors: ${resolved}`);

  // Phase 1: scan mod/CheckpointK_Mod/UI/Layouts/**/*.layout
  // For now: log placeholder
  console.log('[design:sync] no .layout files to rewrite yet (Phase 0)');
  console.log('[design:sync] OK');
}

main();
