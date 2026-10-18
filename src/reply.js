// Chat reply text describing what was composed and why.

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export function buildReply(c, parsed, previous) {
  const m = c.meta;
  const lines = [];
  if (previous) {
    lines.push(`Reworked **${previous.title}** → ${parsed.changes.join(', ')}.`);
  }
  lines.push(`**${c.title}** — ${m.styleLabel} · ${m.key} · ${m.tempo} bpm · ${m.timeSignature.join('/')} · ${fmtTime(m.duration)}`);
  lines.push(`Form: ${c.sections.map((s) => `${s.name} (${s.bars} bars${s.key !== m.key ? `, ${s.key}` : ''})`).join(' → ')}`);
  const theme = c.sections.find((s) => s.type === 'theme') || c.sections[0];
  if (theme) lines.push(`Theme harmony: ${theme.progression.slice(0, 8).join(' – ')}`);
  const textures = [...new Set(c.sections.map((s) => s.texture).filter(Boolean))];
  if (textures.length) lines.push(`Texture: ${textures.join(', ')}`);
  lines.push(`Techniques: ${c.analysis.techniques.slice(0, 5).join('; ')}`);
  const inferred = (m.inferred || []).filter((k) => !['complexity'].includes(k));
  if (inferred.length && !previous) lines.push(`Inferred from style/mood: ${inferred.join(', ')}.`);
  if (m.fallback) lines.push('⚠ The request couldn\'t be realised as asked, so I generated a fresh piece with safe defaults (C major, 96 bpm).');
  return lines.join('\n');
}
