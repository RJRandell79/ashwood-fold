// Checks that should hold at any moment of any run. Returns a list of problems (empty = fine).
export function checkInvariants(S) {
  const bad = [];
  const n = S.agents.length;
  const fin = (v, what) => { if (typeof v !== 'number' || !Number.isFinite(v)) bad.push(`${what} is not a finite number (${v})`); };
  for (const [k, v] of Object.entries(S.stores)) { fin(v, `stores.${k}`); if (v < -1e-9) bad.push(`stores.${k} is negative (${v})`); }
  if (S.op.length !== n || S.op.some(r => r.length !== n)) bad.push(`opinion matrix is not ${n}x${n}`);
  S.agents.forEach((a, i) => {
    if (a.id !== i) bad.push(`agent at index ${i} has id ${a.id}`);
    fin(a.age, `${a.name}.age`); fin(a.coins, `${a.name}.coins`);
    if (a.coins < -1e-9) bad.push(`${a.name} has negative coins (${a.coins})`);
    for (const k of ['hunger', 'tired', 'lonely']) if (!(a[k] >= 0 && a[k] <= 1)) bad.push(`${a.name}.${k} out of range (${a[k]})`);
    for (const p of a.parents) if (!(p >= 0 && p < n)) bad.push(`${a.name} has unknown parent ${p}`);
    if (a.spouse >= 0) {
      const s = S.agents[a.spouse];
      if (!s) bad.push(`${a.name} has unknown spouse ${a.spouse}`);
      else if (!a.dead && !s.dead && s.spouse !== a.id) bad.push(`${a.name} and ${s.name} disagree about being married`);
    }
    if (!a.dead && !a.home) bad.push(`${a.name} has no home`);
  });
  for (const [id, t] of Object.entries(S.tech)) {
    for (const i of [...t.backers, ...t.opponents]) if (!(i >= 0 && i < n)) bad.push(`idea ${id} lists unknown person ${i}`);
    if (t.state !== 'none' && t.inventor != null && !(t.inventor >= 0 && t.inventor < n)) bad.push(`idea ${id} has unknown inventor`);
  }
  for (let i = 1; i < S.annals.length; i++) if (S.annals[i].t < S.annals[i - 1].t) { bad.push('annals are out of order'); break; }
  if (S.era < 0 || S.era > 4) bad.push(`era out of range (${S.era})`);
  for (const e of S.annals) if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(e.h)) { bad.push(`broken text in the annals: ${e.h.replace(/<[^>]+>/g, '').slice(0, 90)}`); break; }
  return bad;
}
