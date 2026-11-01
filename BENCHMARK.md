# Benchmark

Numbers from `node bench/suite.mjs --llm` on 2026-11-01 (Node 25.2, SQLite built-in, `deepseek-flash`).
Everything here is reproducible; raw runs are in `bench/results/`.

## 1. Long-horizon recall (mock, 90 simulated days × 3 seeds)

Events planted every 3 days; noise 1–3 per day; replay every 10 days; probes use
different wording from the stored fact.

| seed | facts | recall@1 | recall@3 | false recall |
|---|---|---|---|---|
| 1  | 31 | 21 | 21 | 0 |
| 7  | 32 | 13 | 13 | 0 |
| 42 | 34 | 25 | 23 | 0 |
| **mean** | — | **61%** | **59%** | **0** |

recall@3 ≈ recall@1 because the store returns at most a few items and the correct one is almost always first.

## 2. Ablation (90 days, seed 7)

| config | recall@1 | recall of 60d+ facts | emotion ratio |
|---|---|---|---|
| full | **13/32** | **27%** | 1.98x |
| `emotionBoost: 0` | 7/32 | **9%** | 1.28x |
| `hop: 0` (no edges) | 13/32 | 27% | 1.98x |
| `base: 0.85` (fast forget) | 7/32 | 9% | 1.92x |

Two takeaways:

1. **Emotion weighting triples retention of old memories** (27% vs 9%).
2. Edges don't move this metric — they help *topical* recall (see the hop test in `test/`), not literal-match recall.

## 3. Forgetting is real

With the default `base: 0.95` and `minStrength: 0.1`, a *neutral* memory becomes unrecallable after ~45 days:

```
0.95 ^ 45 ≈ 0.10      → gone
```

An *emotional* one (|affect| = 2) lasts ~5× longer:

```
0.95 ^ (225 / 5) ≈ 0.10   → ~7 months
```

This is intentional. Without a strength floor the store never really forgets; it only reorders.

## 4. Long-gap merging (mock)

Same topic 70 days apart, `mergeWindowDays: 7`:

```
events before=2  after=2  keptBoth=true
```

Merging is windowed, so "cycled last month" and "cycled two months ago" stay distinct.
(The older neutral one is still stored but below the recall floor — by design.)

## 5. Dense facts (LLM extraction, `--llm`)

Two turns, three facts each, Chinese:

```
turns=2  events=6  probe hits=6/6
```

Extraction kept all six facts and every probe recalled something.

## 6. Known blind spot: paraphrase

```
fact: 主人骑车二十公里腿酸
probe "腿还疼不疼"     → 1 hit
probe "运动之后的肌肉疼" → 0 hits
```

Recall is lexical. If the probe shares no characters with the stored event, it misses.
A vector index would fix this; it is deliberately out of scope for v0.1.

## Reproduce

```bash
node --test test/hippocampus.test.mjs        # 6 unit tests
node bench/suite.mjs                         # mock scenarios, no model needed
node bench/suite.mjs --llm --api-key sk-...  # + extraction quality
```
