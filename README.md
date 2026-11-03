# dsh-hippocampus

给「大肥鱼」这类**养成型伴侣机器人**用的记忆层。

不是把聊天存进数据库，是让她记得、会忘、还会说“我记不太清了”。

```bash
npm i dsh-hippocampus
```

## 亮点

**🧠 照着海马体抄的**
事件编码 → 巩固 → 遗忘 → 联想 → 元记忆，五个环节对应人脑的海马体，不是一个向量库套壳。

**⏳ 遗忘不是均匀的**
被凶那天的记忆能撑七个月，普通的一天一个半月就没了。
90 天实测：有情绪权重的旧记忆召回率 **27%**，去掉只有 **9%**。

**🤔 她会说「我记不清了」**
每条记忆带确定度——记得清 / 大概记得 / 只记得有这回事。

**🔄 改口就失效**
你说过喜欢咖啡，后来说戒了——旧的那条自动作废，**她不会自相矛盾**。

**🧵 关系有温度**
久不出现会淡，吵架会记着一个疙瘩，原谅了才解开。

**🔌 零依赖**
Node 内置 SQLite，一个本地文件就是全部记忆。不上传，不需要服务。

**🕸 不绑平台**
QQ、im、网页、Telegram、一个 curl 都行——同一个人从几个门进来，记忆只有一份。

## 功能

- **事件记忆**：把对话变成「谁、何时、发生了什么、什么情绪」
- **情绪加权遗忘**：被感动的记得久，日常的忘得快（90 天实测 27% vs 9%）
- **确定度**：记得清 / 大概记得 / 只记得有这回事——她不会装确定
- **改口即失效**：你改主意了，旧记忆自动作废，不会自相矛盾
- **关系层**：跟每个人的亲密、信任、没解开的疙瘩
- **事实 / 章节 / 技能 / 缺口**：住哪、哪阵子、怎么做事、什么不懂
- **按人隔离**：A 看不到 B 的记忆，群聊看不到私聊
- **零依赖**：Node 内置 SQLite，一个本地文件就是全部记忆

## 结构

```
              QQ 桥 / im / 网页 / 别的软件
                          │
                   identities 表（同一人 = 一个 subject）
                          │
        ┌─────────────────┴─────────────────┐
        │            handleTurn()           │
        │  解析身份 → 组装 context → 召回   │
        └─────────────────┬─────────────────┘
                          │
   ┌──────────┬───────────┼───────────┬──────────┐
 events     relations    facts      chapters   skills / gaps
 事件       关系         事实        章节       技能 / 缺口
   └──────────┴───────────┴───────────┴──────────┘
                          │
                  context() → 提示词块
```

## 使用

**直接调库**

```js
import { createHippocampus } from 'dsh-hippocampus'

const hip = await createHippocampus({ apiKey: process.env.DEEPSEEK_API_KEY })

// 每条消息
const r = await hip.handleTurn({ channel: 'qq', externalId: msg.user_id, text, reply })
// r.context → 塞进系统提示，r.recall → 召回结果

// 每天一次
await hip.replay()
```

**HTTP 接口**（任何语言）

```js
import { createMemoryServer } from 'dsh-hippocampus/http'
await createMemoryServer({ hip, port: 7717, token: 'secret' })
```

```bash
curl -s localhost:7717/context -H 'authorization: Bearer secret' \
  -H 'content-type: application/json' \
  -d '{"channel":"telegram","externalId":"42","text":"我腿疼"}'
```

**DSH 插件**（im / 网页）

```bash
dsh plugin --profile web add github:kianayang/dsh-hippocampus
```

**命令行**

```bash
node cli.mjs demo                          # 不需要模型，先看效果
node cli.mjs encode --turns turns.json
node cli.mjs replay
node cli.mjs context --subject 主人 "我腿疼"
node cli.mjs list 20 | audit | stats
```

提示词怎么配：见 [docs/prompt.md](docs/prompt.md)。多种接入方式：见 [docs/integration.md](docs/integration.md)。实测数据：见 [docs/bench.md](docs/bench.md)。

## 不适合

客服 FAQ、通用助理、多租户 SaaS、知识库问答——那些用 RAG。

## 开发

```bash
npm test     # 26 项
```

MIT.
