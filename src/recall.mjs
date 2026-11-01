import { daysBetween } from './store.mjs'

export function candidates(text, max = 12) {
  const clean = String(text || '').replace(/[^\p{Script=Han}A-Za-z0-9]/gu, '')
  const out = new Set()
  for (let n = 4; n >= 2; n--) {
    for (let i = 0; i + n <= clean.length && out.size < max; i++) out.add(clean.slice(i, i + n))
  }
  if (!out.size && clean) out.add(clean)
  return [...out]
}

export function recall({ db, cfg, text, today }) {
  const terms = candidates(text)
  if (!terms.length) return []
  const cond = terms.map(() => '(what like ? or topic like ?)').join(' or ')
  const params = terms.flatMap((t) => [`%${t}%`, `%${t}%`])
  let rows = db.prepare(`select id,day,who,what,detail,strength from events where ${cond}
    order by strength desc, day desc limit ?`).all(...params, cfg.recall.limit)

  if (rows.length) {
    const ids = rows.map((r) => r.id)
    const ph = ids.map(() => '?').join(',')
    const extra = db.prepare(`select e.id,e.day,e.who,e.what,e.detail,e.strength
      from edges ed join events e on e.id = ed.b
      where ed.a in (${ph}) and e.id not in (${ph})
      order by e.strength desc limit ?`).all(...ids, ...ids, cfg.recall.hop)
    rows = rows.concat(extra)
    db.prepare(`update events set last_recall=? where ${cond}`).run(today, ...params)
  }

  return rows.map((r) => {
    const age = daysBetween(r.day, today)
    const level = r.detail && age <= cfg.confidence.clearDays
      ? (cfg.language === 'en' ? 'clear' : '记得清')
      : age <= cfg.confidence.vagueDays
        ? (cfg.language === 'en' ? 'roughly' : '大概记得')
        : (cfg.language === 'en' ? 'barely' : '只记得有这回事')
    return { day: r.day, who: r.who, what: r.what, level, strength: r.strength }
  })
}

export function formatRecall(items) {
  return items.map((i) => `${i.day} ${i.who}：${i.what}（${i.level}）`).join('\n')
}
