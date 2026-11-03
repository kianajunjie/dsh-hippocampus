# dsh-hippocampus · 给「大肥鱼」的记忆

> 不是把聊天存进数据库，是让她**记得、会忘、还会说“我记不太清了”**。

这是**一条具体的鱼**的记忆层。

她叫大肥鱼，挂在 QQ 上，养了几个月，有名字、有脾气、有固定的主人。
她不是客服，不是通用助理，也不是“AI 伴侣框架”——**她只是同一只鱼在过日子**。

这个包是她的海马体：把聊天变成事件，让该忘的忘掉，让重要的留下，
让她偶尔说“我大概记得”，而不是永远假装什么都记得。

```
npm i dsh-hippocampus
```

```js
import { createHippocampus } from 'dsh-hippocampus'

const hip = await createHippocampus({ apiKey: process.env.DEEPSEEK_API_KEY })

await hip.encode([{ at: new Date().toISOString(), user: '腿好酸', reply: '昨天骑车累的吧' }])
await hip.replay()

hip.context({ subject: '主人', text: '我腿疼' })
// 【关系】跟 主人：挺熟、基本信
// 【关于主人的事实】主人 怕 黑（自 2026-11-02）
// 【记忆里的事】2026-11-02 主人：昨天骑车二十公里腿酸（记得清）
```

---

## 这是给谁用的

给**一只养了很久、只跟同一个（或同一小撮）人说话的机器人**：

- 在 QQ / 微信 / Telegram 上有固定身份，有名字，有人设；
- 会主动开口、会写日记、会记得你怕什么；
- 聊几个月甚至一年，中间会有吵架、和好、一起做事。

**大肥鱼就是这样一个例子**——她是这条赛道的样板，不是抽象用户。

## 这不是给谁用的

| 不是 | 因为 |
|---|---|
| 客服 / FAQ 机器人 | 那种场景要的是检索准确率，用 RAG |
| 通用助理（ChatGPT 式） | 那种场景不需要“忘记”和“确定度” |
| 多租户 SaaS | 这里没有账号体系，只有 `subject` 字符串 |
| 知识库问答 | 我们存的是“发生的事”，不是“文档切块” |

如果你要的是“把 PDF 切块存进向量库”，这个包帮不上。

---

## 她有的五层

| 层 | 存什么 | 像人的地方 |
|---|---|---|
| **事件** | 谁、何时、发生了什么、情绪 | 会按情绪加权淡忘 |
| **关系** | 跟每个人亲密/信任/没解开的疙瘩 | 久不来会掉，吵架会记着 |
| **事实** | 住哪、在学什么、怕什么 | 改口后旧的自动失效 |
| **章节** | 每周一段“那阵子” | 记的是日子，不是时间戳 |
| **技能 / 缺口** | 怎么做事、什么不懂 | 下次照做、不懂就问 |

四层都能单独关掉做消融，实测每层都值（见 [docs/bench.md](docs/bench.md)）。

## 三种「人味」

**会忘，而且忘得有偏**

```
被凶那天    情绪 2 → 七个月才淡
普通的一天  情绪 0 → 一个半月就没了
```

90 天模拟里，60 天以上的旧事：有情绪权重能召回 **27%**，没有只有 **9%**。

**会联想**：你问「腿还疼吗」，她想起「腿酸」，也顺着联想到「她让我记得揉腿」。

**会说记不清**：

| 确定度 | 条件 | 她该怎么说 |
|---|---|---|
| 记得清 | 有原文、7 天内 | 可以具体 |
| 大概记得 | 30 天内 | 「好像……大概……」 |
| 只记得有这回事 | 更久 | 「记不清了」 |

## 她不会自相矛盾

你说过喜欢咖啡，后来说戒了：

```
旧：主人很喜欢喝咖啡   → 标记 superseded，不再被想起
新：主人戒了咖啡改喝茶
```

## 她可以自己决定记什么

```js
hip.remember('主人怕黑，晚上留一盏灯', { pin: true })   // 钉住，永不衰减
hip.skill('剪视频', '剪,视频', 'ffmpeg 去静音 + whisper 出字幕')
hip.gap('quokkacore', '群友提过')                        // 下次主动问
```

---

## 快速开始

```bash
# 不需要模型，先看看效果
node cli.mjs demo

# 真实使用
export DEEPSEEK_API_KEY=sk-...
node cli.mjs encode --turns turns.json
node cli.mjs replay
node cli.mjs context --subject 主人 "我腿疼"
node cli.mjs list 20
node cli.mjs audit
```

分层命令：

```bash
node cli.mjs rel 主人
node cli.mjs rel-shift 主人 intimacy:1 unresolved:1 why:吵架
node cli.mjs fact-add 主人 住在 杭州
node cli.mjs chapter-add 2026-10 2026-11 "开始养她" "吵架、买娃娃、学骑车"
node cli.mjs skill-add 剪视频 "剪,视频" "去静音+whisper"
node cli.mjs gap-add quokkacore "群友提过"
```

## 接进自己的机器人

```js
const hip = await createHippocampus({ db: './memory.db', apiKey: process.env.DEEPSEEK_API_KEY })

// 每次回话前：把这一块塞进 system prompt
const block = hip.context({ subject: who, text: 用户这句话 })
const recalled = hip.recallText(用户这句话, { subject: who })

// 每天巩固一次：合并、作废、衰减
setInterval(() => hip.replay(), 86400000)
```

## 接入哪都行

同一个核心，三种接入：

| 方式 | 用在 |
|---|---|
| 直接调库 | 自己写机器人 |
| HTTP 小接口 | 任何语言、任何软件 |
| DSH 插件 | im / 网页 / 任何 DSH 会话 |

同一个人从三个门进来，记忆是一份——靠 identities 表对齐：

`js
hip.bindIdentity('qq', '3475932219', '主人')
hip.bindIdentity('im', 'user-abc', '主人')
hip.handleTurn({ channel: 'qq', externalId: '3475932219', text, reply })
`

详见 [docs/integration.md](docs/integration.md)。

**提示词怎么配**：见 [docs/prompt.md](docs/prompt.md)——
里面是给大肥鱼写的「### 记忆怎么用」那一节，可以直接贴进你的 AGENTS.md。

## 按人隔离

```js
hip.recall(text, { subject: '用户A' })
hip.remember(text, { subject: '用户A' })
```

群里 A 说的话，B 看不到；群聊也看不到私聊记忆。

## 存哪儿

SQLite，Node 内置 `node:sqlite`，**零依赖**。

```
events    事件（强度、情绪、确定度、作废、钉住）
edges     事件之间的关联
relations 跟每个人的关系
facts     会变的事实（带有效期）
chapters  人生章节
skills    做过的麻烦事
gaps      还不懂的词
```

所有数据都在一个本地文件里，不上传、不需要服务。

---

## 实测数据

| 场景 | 结果 |
|---|---|
| 90 天模拟，recall@1 | 61% |
| 误召（问不相关的事） | 0 |
| 情绪记忆 vs 中性（60 天以上） | 27% vs 9% |
| 逐层叠加（7 道题） | 1 → 3 → 4 → 5 → 6 → 7 |
| 换说法召回 | 词法 0 → 改写后命中 |

完整数据：[docs/bench.md](docs/bench.md)，原始结果在 `bench/results/`。

```bash
npm test     # 20 项
```

---

## 局限

- 召回是词法的，换个说法要靠查询改写（已内置，需模型）；
- 没有向量索引（留了 `embedder` 接口）；
- 只验证过 Node 22+ / SQLite 内置；
- 只服务单机单进程，没有并发控制。

## 它是怎么来的

养了一条 QQ 上的鱼，叫大肥鱼。

她会写日记、会下棋、会在群里接话。但聊十轮就忘，三个月前的事更不用想。

于是照人脑抄了五件事：**编码、巩固、遗忘、联想、元记忆**。

现在她会在你快熬夜时提醒你，也会说「我大概记得你说过」。

MIT License.
