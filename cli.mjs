#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createHippocampus } from './src/index.mjs'

const [, , cmd, ...rest] = process.argv
const flags = {}
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) {
    const k = rest[i].slice(2)
    const v = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true
    flags[k] = v
  }
}

function usage() {
  console.log(`dsh-hippo — human-like memory for companion agents

  dsh-hippo encode --turns <file.json> [--db path]
  dsh-hippo replay        [--db path]
  dsh-hippo recall "text" [--db path]
  dsh-hippo stats         [--db path]
  dsh-hippo demo          [--db path]

Options: --db, --api-key, --model, --base-url, --lang zh|en

turns.json: [{"at":"2026-11-01T12:00:00Z","user":"...","reply":"..."}]
`)
}

const config = {
  db: flags.db || undefined,
  apiKey: flags['api-key'] || undefined,
  model: flags.model || undefined,
  baseUrl: flags['base-url'] || undefined,
  language: flags.lang || undefined,
}

const hip = await createHippocampus(config)

if (cmd === 'encode') {
  const file = flags.turns
  if (!file) { usage(); process.exit(2) }
  const turns = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'))
  const r = await hip.encode(turns)
  console.log(JSON.stringify(r))
} else if (cmd === 'replay') {
  const r = await hip.replay()
  console.log(JSON.stringify(r))
} else if (cmd === 'recall') {
  const text = rest.filter((a) => !a.startsWith('--')).join(' ')
  console.log(hip.recallText(text) || '(nothing)')
} else if (cmd === 'stats') {
  console.log(JSON.stringify(hip.stats()))
} else if (cmd === 'demo') {
  // 不需要模型：直接塞几条事件，演示衰减与召回
  const today = new Date().toLocaleDateString('sv-SE')
  const old = new Date(Date.now() - 10 * 86400000).toLocaleDateString('sv-SE')
  const a = hip.addEvent({ day: old, who: 'user', topic: 'cycling', what: 'user said cycling home left the legs sore', affect: 1 })
  const b = hip.addEvent({ day: today, who: 'user', topic: 'cycling', what: 'user mentioned legs still sore today', detail: 'legs sore / rest a bit', affect: -1 })
  const c = hip.addEvent({ day: today, who: 'agent', topic: 'care', what: 'she told the user to stretch before bed', detail: 'stretch before bed', affect: 2 })
  hip.link(b, c)
  console.log('seeded', { a, b, c })
  console.log('--- recall "legs" ---')
  console.log(hip.recallText('legs') || '(nothing)')
  const r = await hip.replay()
  console.log('--- replay ---')
  console.log(JSON.stringify(r))
  console.log('--- stats ---')
  console.log(JSON.stringify(hip.stats()))
} else {
  usage()
}
hip.close()
