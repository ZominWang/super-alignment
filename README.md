# Super Alignment · 超级对齐

[中文](#中文) · [English](#english)

> 一张 AI 学习地图，一个静态内容分发引擎。<br>
> A learning map and static content distribution engine for AI learners.

---

## 中文

**Super Alignment · 超级对齐** 不是一个新的笔记工具，也不是在线课程平台。它的产品边界很清晰：

> **这里是地图，用户自己的笔记工具是目的地。**

它帮助已经开始学习 AI / LLM / RAG / Agent 的人快速回答三个问题：

1. 我现在在整个 AI 知识体系里的什么位置？
2. 下一步最应该学什么？为什么？
3. 我如何把这套内容带回 Obsidian、Anki、Notion、Logseq 或普通 Markdown 工作流里继续沉淀？

当前知识库覆盖：**5 大领域 · 15 个方向 · 74 个主题 · 222 道测评题**。

![知识地图截图](docs/screenshot.png)

### 产品定位

一句话：**AI 学习者的薄弱方向定位器 + 学习路径导航 + 笔记沉淀入口**。

它不试图替代 Obsidian / Notion / Logseq / Anki，而是成为这些工具的上游：

```text
vault/*.md  单一真相源
        │
        ▼
     build.py
        │
        ├── Web 静态版：知识地图 / 学习路径 / 测评推荐 / 搜索定位
        ├── Obsidian Vault：保留 Markdown、wiki 链接和预配置
        ├── Anki 卡片包：从 Quiz 自动生成间隔复习卡片
        └── Markdown 文件夹：可导入 Notion、Logseq 或任意编辑器
```

### 适合谁

主力用户：**探索期 AI 学习者**

- 听说过 LLM / RAG / Agent / MCP，但知识是碎片化的；
- 自学过一些教程或工具，但不知道如何系统化；
- 可能会写代码，也可能完全非技术背景；
- 希望最后把学习内容沉淀到自己熟悉的工具里。

次要用户：**持续学习者**

- 已经在系统学习 AI；
- 用本项目做知识导航、进度追踪、复习导出。

不优先服务：找完整视频课、刷面试题、阅读论文综述的用户。

### 核心能力

#### 1. 知识地图

- **全局总览**：一屏理解 5 大领域、15 个方向、74 个主题之间的结构。
- **节点聚焦**：点击节点后显示浮动动作，包括测评、标记学习状态、复制 Markdown、导出等。
- **目录 / 路径视图**：既可以按知识层级浏览，也可以按学习意图走线性路径。
- **图例与状态**：节点颜色、大小、连线、外环都有明确含义，帮助用户理解图谱，而不是只看一张漂亮的图。

#### 2. 分级诊断

- **快速定位**：5 道入门题，约 1 分钟，适合首次访问时快速获得方向感。
- **完整诊断**：30 道题覆盖 15 个方向，约 12 分钟，生成更完整的雷达图和薄弱方向分析。
- **方向 / 主题测评**：针对单个方向或主题做更细粒度的练习。
- **草稿保护**：答题中途退出会保留进度，下次可以继续。
- **跳过统计**：跳过的题不会静默丢失，会在结果里独立提示。

#### 3. 诚实推荐

推荐只在用户完成测评或产生学习状态之后出现。没有输入，就不伪造“个性化推荐”。

推荐卡片会说明：

- 推荐的主题是什么；
- 为什么推荐它；
- 所属方向和前置关系；
- 可以开始学习，也可以跳过这条。

#### 4. 搜索与定位

- 支持按主题名、英文名、标签、描述搜索；
- 搜索结果可直接跳转到图谱中的具体位置；
- 适合把它当成“AI 知识地图索引”。

#### 5. 内容分发

Web 版只是一个入口，不是终点。用户可以导出到：

| 出口 | 用途 |
|---|---|
| Obsidian Vault | 长期笔记、双链整理、个人知识库 |
| Anki `.apkg` | 间隔复习；构建时导出需要 `genanki` |
| Anki CSV | 兼容旧版或手动导入 |
| Markdown Zip / 文件夹 | 导入 Notion、Logseq 或任意 Markdown 工具 |

浏览器端导出按钮也会提供 Obsidian / Anki CSV / Markdown 下载入口。

#### 6. 本地状态与隐私

本项目是纯静态应用，学习状态默认保存在浏览器本地：

- `localStorage.kg_status`：主题学习状态；
- `localStorage.kg_tested`：已测评主题；
- `sessionStorage.kg_quiz_draft`：未完成测评草稿；
- `localStorage.kg_events`：本地使用事件，用于本机自查和体验优化。

这些数据不会上传到服务器。

### 快速开始

#### 一键启动

```bash
git clone https://github.com/ZominWang/super-alignment.git
cd super-alignment
bash run.sh
```

然后打开：

```text
http://localhost:5001
```

#### 不用命令行？

直接访问在线版，零安装，开浏览器即用：

👉 **[zominwang.github.io/super-alignment](https://zominwang.github.io/super-alignment/)**

`run.sh` 会自动创建虚拟环境、安装依赖、运行 `build.py` 编译静态数据，并启动本地 HTTP 服务。

#### 手动构建与预览

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python build.py --no-validate
cd web
python3 -m http.server 5001
```

如果想使用其他端口，例如 5004：

```bash
cd web
python3 -m http.server 5004
```

#### 构建导出文件

```bash
python build.py --export obsidian   # Obsidian Vault
python build.py --export anki       # Anki .apkg，需要 genanki
python build.py --export anki-csv   # Anki CSV
python build.py --export markdown   # Markdown 文件夹/压缩包
python build.py --export all        # 全量导出
```

导出产物在 `exports/` 目录下。

#### 静态部署

```bash
python build.py --no-validate
# 将 web/ 目录部署到 GitHub Pages、Netlify、Vercel 或任意静态托管服务
```

本项目运行时不需要 Flask、数据库或后端服务。

### 项目结构

```text
knowledge_graph/
├── vault/                      # Markdown 知识库：唯一内容源
│   ├── areas/                  # 5 大领域
│   ├── directions/             # 15 个方向
│   ├── topics/                 # 74 个主题，含正文与 Quiz
│   └── paths/                  # 学习路径
├── web/                        # 纯静态 Web 应用
│   ├── index.html              # 静态入口
│   ├── static/css/style.css    # 视觉与交互样式
│   ├── static/js/app.js        # 图谱、诊断、进度、交互逻辑
│   ├── static/js/api-shim.js   # 本地 API 适配层
│   ├── static/js/data.js       # build.py 生成的数据文件
│   ├── static/js/export.js     # 浏览器端导出
│   └── static/js/i18n.js       # 中英双语文案
├── web/services/               # Python 内容解析与构建服务
├── exports/                    # 构建时导出的 Obsidian / Anki / Markdown
├── docs/CONTRACT.md            # 前后端数据契约
├── build.py                    # 静态构建与导出脚本
├── requirements.txt            # 构建依赖
└── run.sh                      # 一键启动脚本
```

### 知识结构

| 领域 | 方向 | 代表主题 |
|---|---|---|
| 基础理论 | 数学基础、机器学习、深度学习 | 线性代数、监督学习、神经网络基础 |
| 大语言模型 | 模型架构、训练与优化、推理部署 | Attention、Transformer、SFT、RLHF、量化 |
| 应用技术 | 提示工程、RAG、AI Agent | 上下文工程、RAG 基础、MCP、Skill 构建 |
| 工程实践 | 开发框架、MLOps、测评与质量 | OpenAI API、LangChain、RAGAS、成本优化 |
| 安全与对齐 | 对齐技术、AI 安全、治理伦理 | Constitutional AI、提示注入、隐私与治理 |

### 扩展知识库

所有主题都在 `vault/topics/` 中，每个主题是一个 Markdown 文件：

```markdown
---
id: your_topic_id
name: 主题名称
name_en: Topic Name
area: application
direction: agent
difficulty: 2
importance: 5
prerequisites: [agent_basics]
tags: [agent, mcp]
---

知识点描述……

## Quiz

### Q1
**问题**: 题目内容？

- A. 选项 A
- B. 正确选项  ✓
- C. 选项 C
- D. 选项 D

**解析**: 为什么选 B……
```

修改内容后运行：

```bash
python build.py --no-validate
```

### 设计原则

1. **内容单一真相源**：维护 `vault/*.md`，不要在 Web UI、Anki、Obsidian 中各维护一份。
2. **地图不是目的地**：Web 负责结构、路径、诊断、定位；深度笔记和长期加工留给用户自己的工具。
3. **推荐必须诚实**：没有用户输入就不伪造个性化推荐。
4. **静态优先**：能通过 `build.py + index.html` 解决，就不要引入长期后端维护面。
5. **导出不是附属功能**：导出是产品闭环的一部分，代表用户真正把知识带走。

### 技术栈

- 内容：Markdown + YAML frontmatter
- 构建：Python 3
- 前端：原生 JavaScript + D3.js v7
- 运行时：静态 HTML / CSS / JS
- 状态：浏览器 localStorage / sessionStorage
- 导出：Obsidian Vault、Anki `.apkg` / CSV、Markdown

### License

MIT

---

## English

**Super Alignment** is not another note-taking app and not an online course platform. Its product boundary is intentionally narrow:

> **This project is the map. Your own note-taking tool is the destination.**

It helps AI learners answer three practical questions:

1. Where am I in the AI knowledge landscape?
2. What should I learn next, and why?
3. How do I take the material back into Obsidian, Anki, Notion, Logseq, or a plain Markdown workflow?

Current coverage: **5 areas · 15 directions · 74 topics · 222 quiz questions**.

### Product positioning

In one sentence: **a weak-spot locator, learning-path navigator, and note-taking handoff layer for AI learners**.

It does not compete with Obsidian / Notion / Logseq / Anki. It sits upstream of them:

```text
vault/*.md  single source of truth
        │
        ▼
     build.py
        │
        ├── Static Web: knowledge map, paths, diagnostics, recommendations, search
        ├── Obsidian Vault: Markdown, wikilinks, preconfigured vault structure
        ├── Anki deck: spaced-repetition cards generated from quizzes
        └── Markdown folder: portable content for Notion, Logseq, or any editor
```

### Who it is for

Primary users: **AI learners in the exploration stage**

- You have heard of LLMs, RAG, Agents, MCP, etc.;
- your knowledge is fragmented;
- you may or may not have a technical background;
- you want a system that tells you where to go next;
- you prefer to keep long-term notes in your own tools.

Secondary users: **continuous learners** who use the project for navigation, progress tracking, and export-based review.

Not the main audience: users looking for a full video course, interview drills, or research-paper surveys.

### Core capabilities

#### 1. Knowledge map

- **Global overview**: see 5 areas, 15 directions, and 74 topics in one map.
- **Node focus actions**: click a node to open contextual actions such as quiz, mark as learning/mastered, copy Markdown, and export.
- **Directory and path views**: browse by hierarchy or follow an intention-based learning path.
- **Readable graph semantics**: colors, sizes, links, and rings are meaningful, not decorative.

#### 2. Tiered diagnostics

- **Quick diagnostic**: 5 beginner-friendly questions, about 1 minute.
- **Full diagnostic**: 30 questions across all 15 directions, about 12 minutes.
- **Direction/topic quizzes**: practice a single direction or topic.
- **Draft protection**: unfinished quizzes are saved locally and can be resumed.
- **Skipped-question signals**: skipped questions are recorded and shown in results instead of silently disappearing.

#### 3. Honest recommendations

Recommendations only appear after the user has provided signal through diagnostics or learning status. No fake personalization.

A recommendation explains:

- what topic is recommended;
- why it is recommended;
- where it sits in the knowledge graph;
- whether you want to start it or dismiss it.

#### 4. Search and locate

- Search by Chinese name, English name, tags, and descriptions;
- jump directly from search results to the corresponding graph location;
- use it as an index for the AI knowledge landscape.

#### 5. Content distribution

The Web UI is an entry point, not the final destination. Export options include:

| Output | Use case |
|---|---|
| Obsidian Vault | long-term notes, backlinks, personal knowledge base |
| Anki `.apkg` | spaced repetition; build-time export requires `genanki` |
| Anki CSV | compatibility with older/manual import workflows |
| Markdown Zip / folder | import into Notion, Logseq, or any Markdown tool |

The browser export menu also supports Obsidian / Anki CSV / Markdown downloads.

#### 6. Local state and privacy

The app is static. Learning state is stored locally in the browser:

- `localStorage.kg_status`: topic status;
- `localStorage.kg_tested`: tested topics;
- `sessionStorage.kg_quiz_draft`: unfinished quiz draft;
- `localStorage.kg_events`: local usage events for self-inspection and UX improvement.

These records are not uploaded.

### Quick start

#### One-command start

```bash
git clone https://github.com/ZominWang/super-alignment.git
cd super-alignment
bash run.sh
```

Then open:

```text
http://localhost:5001
```

#### No command line?

Use the hosted version — zero install, just open your browser:

👉 **[zominwang.github.io/super-alignment](https://zominwang.github.io/super-alignment/)**

`run.sh` creates a virtual environment, installs dependencies, runs `build.py`, and starts a local static HTTP server.

#### Manual build and preview

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python build.py --no-validate
cd web
python3 -m http.server 5001
```

Use another port if needed:

```bash
cd web
python3 -m http.server 5004
```

#### Build export artifacts

```bash
python build.py --export obsidian   # Obsidian Vault
python build.py --export anki       # Anki .apkg, requires genanki
python build.py --export anki-csv   # Anki CSV
python build.py --export markdown   # Markdown folder/archive
python build.py --export all        # all outputs
```

Artifacts are written to `exports/`.

#### Static deployment

```bash
python build.py --no-validate
# Deploy the web/ directory to GitHub Pages, Netlify, Vercel, or any static host.
```

No Flask server, database, or backend service is required at runtime.

### Repository structure

```text
knowledge_graph/
├── vault/                      # Markdown knowledge base: single source of truth
│   ├── areas/                  # 5 areas
│   ├── directions/             # 15 directions
│   ├── topics/                 # 74 topics with content and quizzes
│   └── paths/                  # learning paths
├── web/                        # static Web app
│   ├── index.html              # static entry
│   ├── static/css/style.css    # visual and interaction styles
│   ├── static/js/app.js        # graph, diagnostics, progress, interactions
│   ├── static/js/api-shim.js   # local API compatibility layer
│   ├── static/js/data.js       # generated by build.py
│   ├── static/js/export.js     # browser-side exports
│   └── static/js/i18n.js       # Chinese / English UI copy
├── web/services/               # Python parsing and build services
├── exports/                    # generated Obsidian / Anki / Markdown outputs
├── docs/CONTRACT.md            # data contract
├── build.py                    # static build and export script
├── requirements.txt            # build dependencies
└── run.sh                      # one-command local start
```

### Knowledge structure

| Area | Directions | Example topics |
|---|---|---|
| Foundations | Mathematics, Machine Learning, Deep Learning | Linear Algebra, Supervised Learning, Neural Network Basics |
| Large Language Models | Architecture, Training, Inference | Attention, Transformer, SFT, RLHF, Quantization |
| Applications | Prompt Engineering, RAG, AI Agent | Context Engineering, RAG Basics, MCP, Skill Building |
| Engineering Practice | Frameworks, MLOps, Evaluation | OpenAI API, LangChain, RAGAS, Cost Optimization |
| Safety & Alignment | Alignment, AI Security, Governance | Constitutional AI, Prompt Injection, Privacy & Governance |

### Extending the knowledge base

Each topic lives in `vault/topics/` as a Markdown file:

```markdown
---
id: your_topic_id
name: 主题名称
name_en: Topic Name
area: application
direction: agent
difficulty: 2
importance: 5
prerequisites: [agent_basics]
tags: [agent, mcp]
---

Topic description...

## Quiz

### Q1
**Question**: Your question?

- A. Option A
- B. Correct option  ✓
- C. Option C
- D. Option D

**Explanation**: Why B is correct...
```

After editing content, rebuild:

```bash
python build.py --no-validate
```

### Design principles

1. **Single source of truth**: maintain content in `vault/*.md`, not separately in Web, Anki, and Obsidian.
2. **Map, not destination**: the Web app handles structure, paths, diagnostics, and locating; deep notes stay in the user’s own tools.
3. **Honest recommendations**: no personalized recommendation without user signal.
4. **Static-first**: if `build.py + index.html` is enough, avoid long-term backend maintenance.
5. **Export is part of the product loop**: exporting means the user can actually take the knowledge away.

### Tech stack

- Content: Markdown + YAML frontmatter
- Build: Python 3
- Frontend: Vanilla JavaScript + D3.js v7
- Runtime: static HTML / CSS / JS
- State: browser localStorage / sessionStorage
- Exports: Obsidian Vault, Anki `.apkg` / CSV, Markdown

### License

MIT
