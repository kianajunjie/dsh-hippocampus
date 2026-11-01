# dsh-hippocampus

**Human-like memory for companion agents.**
Events, not documents. Forgetting that is not random. Recall that admits it is unsure.

一个给「伴侣型 agent」用的记忆层：把对话编码成事件，按情绪加权遗忘，召回时**承认自己记不清**。

```
npm i @dsh-community/hippocampus
```

```js
import { createHippocampus } from '@dsh-community/hippocampus'

const hip = await createHippocampus({ db: './memory.db', apiKey: process.env.DEEPSEEK_API_KEY })

await hip.encode([{ at: new Date().toISOString(), user: '腿好酸', reply: '是不是昨天骑车累的' }])
await hip.replay()                       // 合并 + 情绪加权衰减

hip.recallText('我腿疼')
// 2026-11-01 user：user said legs were sore after cycling（大概记得）
```

---

## 为什么不是又一个 RAG

Most memory libraries store documents and retrieve them. That makes an agent **accurate**, not **alive**.

大多数记忆库做的是「存文档 → 向量检索」。结果是**准确**，但不是**像人**。

人脑的记忆有三个特点，这套只做这三个：

| 人脑 | 这里 |
|---|---|
| **会忘，而且忘得有偏** | 情绪加权衰减：被感动的记得久，日常的忘得快 |
| **会联想** | 事件之间建边，召回时顺藤摸瓜一跳 |
| **会承认记不清** | 每条记忆带确定度：`记得清 / 大概记得 / 只记得有这回事` |

不做的：多模态、感官编码、神经可塑性。那些不是工程问题。

---

## 三个动作

```
编码 encode   对话 → 事件（谁 / 什么时候 / 什么主题 / 发生了什么 / 情绪）
重放 replay   合并相似事件 + 衰减 + 生成一句「印象」
召回 recall   按线索命中 + 沿边跳转 + 标注确定度
```

### 1. 编码

让模型从一段对话里抽 0–3 个事件，只抽**约定、近况变化、偏好、情绪转折**。寒暄不抽。

### 2. 重放

```
同人同主题的事件合并（强度累加，封顶 mergeCap）
衰减 = base ^ (天数 / (1 + |情绪| × emotionBoost))
   情绪 0 → 每天 0.95
   情绪 2 → 每天 0.99（忘得慢五倍）
生成一句「今天的印象」，像人回忆，允许模糊
```

### 3. 召回

```
你的话 → 拆成 2~4 字片段 → 命中事件
       → 沿关联边再跳 1~2 个
       → 按强度排序
       → 附确定度（看有没有原文、隔了多久）
```

---

## 确定度是怎么算的

| 级别 | 条件 | 用的时候怎么说话 |
|---|---|---|
| `clear` / 记得清 | 有原文且 ≤ `confidence.clearDays` 天 | 可以具体 |
| `roughly` / 大概记得 | ≤ `vagueDays` 天 | 「好像…大概…」 |
| `barely` / 只记得有这回事 | 更久 | 「记不清了」 |

把这段塞进系统提示，agent 就会自然地说「我大概记得那天你腿疼」，而不是背诵时间戳。

---

## CLI

```bash
# turns.json: [{"at":"2026-11-01T12:00:00Z","user":"...","reply":"..."}]
node cli.mjs encode --turns turns.json
node cli.mjs replay
node cli.mjs recall "我腿疼"
node cli.mjs stats
node cli.mjs demo          # 不需要模型，塞假数据演示衰减和召回
```

## 配置

```js
createHippocampus({
  db: './memory.db',
  model: 'deepseek-flash',
  baseUrl: 'https://api.deepseek.com',
  language: 'zh',            // 'zh' | 'en'
  decay: { base: 0.95, emotionBoost: 2, floor: 0.05, mergeCap: 5 },
  confidence: { clearDays: 7, vagueDays: 30 },
  recall: { limit: 3, hop: 2 },
})
```

也可以注入自己的模型：

```js
createHippocampus({ llm: async (messages, maxTokens) => '日期|谁|主题|发生了什么|0' })
```

---

## Benchmarks

See [BENCHMARK.md](BENCHMARK.md) for full numbers (90-day simulation, ablations, dense-fact extraction).


Two self-contained benches. The mock one needs no model:

```bash
node bench/run.mjs --mode mock --days 60        # decay / recall / confidence at scale
node bench/run.mjs --mode llm  --days 10 --api-key $DEEPSEEK_API_KEY   # extraction quality
```

Mock (60 simulated days, 18 planted facts, 111 noise events):

```
recall@3   7d 100%   30d 86%   60d 89%
emotion retention   neutral 0.16 vs emotional 0.28  → 1.74x
false recall (unrelated query)  0
```

LLM (10 days, 20 real-ish turns in Chinese):

```
extracted events 10 / 10 facts
recall@3         10 / 10
```

Caveats: the mock plants events directly (it tests decay and recall, not extraction), and the LLM bench uses short dialogues, so treat these as upper bounds. Phrasing that shares no characters with the stored event will still miss — that is what a vector index would fix, and it is deliberately out of scope for v0.1.



SQLite（Node 内置 `node:sqlite`，**零依赖**）。

```
events(id, day, who, topic, what, detail, affect, strength, last_recall, created)
edges(a, b, w)
```

数据全在本地文件里。**不上传、不加密门、不依赖服务**。

---

## 什么时候用 / 什么时候别用

**适合**

- 伴侣 / 养成 / 陪伴型 agent
- 需要「关系连续性」而不是「知识库」的场景
- 想让它偶尔说「我记不太清」

**不适合**

- 客服 FAQ（用 RAG）
- 需要精确引用原文的检索
- 多租户 SaaS（没有用户隔离）

---

## License

MIT
