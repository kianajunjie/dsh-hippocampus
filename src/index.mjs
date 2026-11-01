import { resolveConfig } from './config.mjs'
import { openStore, daysBetween } from './store.mjs'
import { makeLLM } from './llm.mjs'
import { encodeTurns } from './encode.mjs'
import { replay as runReplay } from './replay.mjs'
import { recall as runRecall, formatRecall, candidates } from './recall.mjs'

/**
 * Create a hippocampus instance.
 *
 * @param {object} options
 * @param {string} [options.db]        sqlite file path
 * @param {string} [options.apiKey]    LLM key (defaults to DEEPSEEK_API_KEY)
 * @param {string} [options.model]     model name
 * @param {string} [options.baseUrl]   OpenAI-compatible base URL
 * @param {Function} [options.llm]     inject your own chat(messages, maxTokens) => string
 * @param {'zh'|'en'} [options.language]
 * @param {object} [options.decay]     { base, emotionBoost, floor, mergeCap }
 * @param {object} [options.confidence]{ clearDays, vagueDays }
 * @param {object} [options.recall]    { limit, hop }
 * @param {object} [options.encode]    { maxPerBatch, batchTurns }
 */
export async function createHippocampus(options = {}) {
  const cfg = resolveConfig(options)
  const db = openStore(cfg.db)
  const llm = options.llm || (cfg.apiKey ? makeLLM(cfg) : null)
  const today = () => new Date().toLocaleDateString('sv-SE')

  return {
    cfg,
    db,

    /** Encode turns into events. turn = { at, user, reply } */
    async encode(turns = []) {
      if (!llm) throw new Error('encode needs an llm (pass options.llm or apiKey)')
      return encodeTurns({ db, llm, cfg, turns })
    },

    /** Consolidate: merge near-duplicates, apply emotion-weighted decay, write an impression. */
    async replay() {
      return runReplay({ db, llm, cfg, today: today() })
    },

    /** Recalls events relevant to a sentence, with confidence labels. */
    recall(text) {
      return runRecall({ db, cfg, text, today: today() })
    },

    /** Recalls and formats as text lines, ready to drop into a prompt. */
    recallText(text) {
      return formatRecall(this.recall(text))
    },

    stats() {
      const n = db.prepare('select count(*) as n, round(avg(strength),2) as strength from events').get()
      const e = db.prepare('select count(*) as n from edges').get()
      return { events: n.n, avgStrength: n.strength, edges: e.n }
    },

    /** Insert an event directly (useful for tests / migrations). */
    addEvent(e) {
      const st = db.prepare(`insert into events(day,who,topic,what,detail,affect,strength,created)
        values(?,?,?,?,?,?,?,?)`)
      st.run(e.day, e.who, e.topic, e.what, e.detail || '', e.affect || 0, e.strength ?? 1, new Date().toISOString())
      return db.prepare('select last_insert_rowid() as id').get().id
    },

    link(a, b, w = 1) {
      db.prepare('insert or replace into edges(a,b,w) values(?,?,?)').run(a, b, w)
    },

    close() { db.close() },
  }
}

export { resolveConfig, candidates, formatRecall, daysBetween }
