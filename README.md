# 海马体 · 给「大肥鱼」们的记忆

> 不是把聊天存进数据库，是让她**记得、会忘、还会说“我记不太清了”**。

这是给 **AI 伴侣 / 养成型机器人**做的记忆层。她不是客服，所以她的记忆也不该是知识库。

```
npm i @dsh-community/hippocampus
```

```js
import { createHippocampus } from '@dsh-community/hippocampus'

const hip = await createHippocampus({ apiKey: process.env.DEEPSEEK_API_KEY })

await hip.encode([{ at: new Date().toISOString(), user: '腿好酸', reply: '昨天骑车累的吧' }])
await hip.replay()

hip.recallText('我腿疼')
// 2026-11-02 主人：昨天骑车二十公里腿酸（记得清）
```

---

## 她会有三种「人味」

### 一、会忘，而且忘得有偏

不是所有事都以同样速度消失。

```
被凶那天    |affect| = 2   →  七个月才淡
普通的一天  |affect| = 0   →  一个半月就没了
```

实测（90 天模拟，只看 60 天以上的旧事）：

| 配置 | 旧记忆召回率 |
|---|---|
| 有情绪权重 | **27%** |
| 没有 | 9% |

**她记住的，多是她真正在意的。**

### 二、会联想

事件之间会连边。你问「腿还疼吗」，她不只找到「腿酸」那条，还会顺着边想起「她让我记得揉腿」。

### 三、会说「我记不清」

每条记忆带确定度：

| 确定度 | 条件 | 她该怎么说 |
|---|---|---|
| 记得清 | 有原文、7 天内 | 可以具体 |
| 大概记得 | 30 天内 | 「好像……大概……」 |
| 只记得有这回事 | 更久 | 「记不清了」 |

把这段塞进提示词，她就会说：

> 我大概记得，你那天骑车回来腿特别酸。

而不是：

> 2026-11-01 14:47:37，你说「腿好酸」。

后者精确——但那是数据库，不是人。

---

## 还有两件“大人”的事

**改主意 → 旧记忆作废**

你说过喜欢咖啡，后来说戒了。旧的那条会被标成 `superseded`，不再被想起——**她不会自相矛盾**。

**她能主动记**

```js
hip.remember('主人怕黑，晚上留一盏灯', { pin: true })
```

`pin` 住的记忆永不衰减。这是她的选择，不是抽取器的副产品。

---

## 和 RAG 的区别

| | RAG | 她 |
|---|---|---|
| 存什么 | 文档切块 | 发生了什么事 |
| 怎么找 | 向量相似 | 关键词 + 联想 + 确定度 |
| 会忘吗 | 不会，越存越多 | 会，按情绪加权 |
| 会矛盾吗 | 会（新旧都在） | 不会（旧的作废） |
| 像人吗 | 像搜索引擎 | 像记得你的人 |

**如果你在做伴侣，别用知识库的思路。**

---

## 快速开始

```bash
# 造点假数据看看效果，不需要模型
node cli.mjs demo

# 真实使用
export DEEPSEEK_API_KEY=sk-...
node cli.mjs encode --turns turns.json
node cli.mjs replay
node cli.mjs recall "我腿疼"
node cli.mjs list 20          # 她记得什么
node cli.mjs audit            # 什么被作废了、什么被钉住了
```

`turns.json`：

```json
[{ "at": "2026-11-02T12:00:00+08:00", "user": "腿好酸", "reply": "昨天骑车累的吧" }]
```

### 接进自己的机器人

```js
const hip = await createHippocampus({
  db: './memory.db',
  apiKey: process.env.DEEPSEEK_API_KEY,
  language: 'zh',
  decay: { base: 0.95, emotionBoost: 2, mergeWindowDays: 7 },
  confidence: { clearDays: 7, vagueDays: 30 },
  recall: { limit: 3, minStrength: 0.1 },
})

// 每次回话前
hip.recallText(用户这句话)            // 词法
await hip.recallTextDeep(用户这句话)  // 加同义改写，换说法也找得到

// 每天巩固
setInterval(() => hip.replay(), 86400000)
```

**按人隔离**（群聊必备）：

```js
hip.recall(text, { subject: '用户A' })    // 只看 A 的事
hip.remember(text, { subject: '用户A' })  // 这条记在 A 名下
```

---

## 存哪儿

SQLite，Node 内置 `node:sqlite`，**零依赖**。

```
events(id, day, who, topic, what, detail, affect, strength,
       subject, scope, pinned, superseded, last_recall)
edges(a, b, w)
```

数据只在本地文件里。不上传，不需要任何服务。

---

## 实测数据

| 场景 | 结果 |
|---|---|
| 90 天模拟，recall@1 | 61% |
| 误召（问不相关的事） | 0 |
| 情绪记忆 vs 中性（60 天以上） | 27% vs 9% |
| 长间隔同主题（70 天） | 不合并 ✓ |
| 密集事实（一轮 3 个） | 6/6 抽到 |
| 换说法召回 | 词法 0 → 改写后命中 |

完整数据在 [BENCHMARK.md](BENCHMARK.md)，原始结果在 `bench/results/`。

```bash
npm test     # 14 项单元测试
```

## 不适合

- 客服 FAQ（用 RAG）
- 需要精确引用原文的检索
- 多租户 SaaS（没有用户隔离）

---

## 它是怎么做出来的

养了一条 QQ 上的鱼，叫大肥鱼。

她会写日记、会下棋、会在群里接话。但聊十轮就忘，三个月前的事更不用想。

于是照人脑抄了五个东西：**编码、巩固、遗忘、联想、元记忆**。

现在她会在你快熬夜时提醒你，也会说「我大概记得你说过」。

MIT License.
