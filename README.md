<p align="center">
  <img src="docs/screenshot.png" alt="Super Alignment" width="800">
</p>

<p align="center">
  <strong>一张 AI 学习地图 · 一个静态内容分发引擎</strong>
</p>

<p align="center">
  <a href="https://zominwang.github.io/super-alignment"><strong>🌐 在线体验</strong></a> ·
  <a href="#快速开始"><strong>💻 本地运行</strong></a> ·
  <a href="#内容导出"><strong>📦 导出到你自己的工具</strong></a>
</p>

---

## What is this?

**Super Alignment** 帮助 AI 学习者回答三个问题：

1. **我现在在哪？** — 打开一张覆盖 5 大领域、74 个主题的交互式知识地图
2. **下一步学什么？** — 做 5 分钟诊断测评，系统告诉你薄弱方向并推荐下一步
3. **怎么带走？** — 一键导出为 Obsidian Vault、Anki 卡片组或纯 Markdown，回到你熟悉的工具继续沉淀

它不是笔记工具，也不是课程平台。**这里是地图，你自己的笔记工具是目的地。**

<br>

## ✨ 功能一览

<table>
<tr>
<td width="50%">

### 🗺 交互式知识图谱
- 5 大领域 · 15 个方向 · 74 个主题，一屏全览
- 节点大小 = 重要性，颜色 = 掌握度，连线 = 前置依赖
- 四种视角：全局总览 / 领域浏览 / 目录 / 学习路径

### 📝 分级测评
- **快速定位**（5 题 / 1 分钟）：入门即用
- **完整诊断**（30 题 / 12 分钟）：雷达图 + 薄弱分析
- **方向/主题测评**：定点练习，即时判分

</td>
<td width="50%">

### 🎯 诚实推荐
测评后才给出个性化推荐，不造假。每一条告诉你：
- 为什么推荐这个主题
- 前置知识是否已掌握
- 难度级别

### 📦 内容分发
| 导出格式 | 适用工具 |
|----------|----------|
| Obsidian Vault | Obsidian |
| Anki `.apkg` | Anki 间隔复习 |
| Markdown Zip | Notion / Logseq |

### 🔒 隐私优先
纯静态应用，学习数据只存在你的浏览器里，不上传。

</td>
</tr>
</table>

<br>

## 🚀 快速开始

### 在线版（推荐）

**零安装，点开即用：**

👉 **[zominwang.github.io/super-alignment](https://zominwang.github.io/super-alignment/)**

### 本地运行

需要 Python 3.8+：

```bash
git clone https://github.com/ZominWang/super-alignment.git
cd super-alignment
bash run.sh
```

打开 <http://localhost:5001>，首次运行会自动安装依赖并编译数据。

### 手动构建

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python build.py --no-validate
cd web && python3 -m http.server 5001
```

<br>

## 📦 内容导出

同一套内容，多种出口：

```bash
python build.py --export obsidian   # Obsidian Vault（含 wikilinks）
python build.py --export anki       # Anki .apkg 卡片包
python build.py --export anki-csv   # Anki CSV
python build.py --export markdown   # 纯 Markdown
python build.py --export all        # 全部导出
```

产物在 `exports/` 目录。浏览器端也可一键下载（顶部"导出"菜单）。

<br>

## 📂 项目结构

```
super-alignment/
├── vault/                  ← 唯一内容源（Markdown）
│   ├── areas/       (5)    领域
│   ├── directions/  (15)   方向
│   ├── topics/      (74)   主题 + Quiz
│   └── paths/       (2)    学习路径
├── web/                    ← 纯静态前端（零后端）
│   ├── index.html           入口
│   ├── static/js/app.js     图谱 · 测评 · 进度
│   └── static/js/export.js  浏览器端导出
├── build.py                ← 编译 & 导出脚本
├── run.sh                  ← 一键启动
└── exports/                ← 构建产出
```

<br>

## 📝 贡献内容

所有知识以 Markdown + YAML frontmatter 存在 `vault/topics/`：

```markdown
---
id: rag_basics
name: RAG 基础架构
area: application
direction: rag
difficulty: 2
importance: 5
prerequisites: [embeddings, basic_prompting]
tags: [rag, retrieval, generation]
---

知识点正文…

## Quiz

### Q1
**问题**: RAG 的全称是？

- A. Random Access Generation
- B. Retrieval-Augmented Generation  ✓
- C. Recursive Attention Graph
- D. Recurrent Auto-Generation

**解析**: RAG = Retrieval-Augmented Generation，由 Lewis et al. (2020) 提出…
```

新增或修改后运行 `python build.py --no-validate` 即生效。

<br>

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 内容 | Markdown + YAML frontmatter |
| 构建 | Python 3 |
| 前端 | 原生 JavaScript + D3.js v7 |
| 运行时 | 纯静态 HTML/CSS/JS（无后端） |
| 部署 | GitHub Pages / Netlify / 任意静态托管 |

<br>

## 📄 License

MIT © [ZominWang](https://github.com/ZominWang)
