# AI 知识图谱

一个开箱即用的 AI / LLM / Agent 知识学习系统。通过交互式知识图谱、线性学习路径、诊断测评和进度追踪，帮助你系统掌握 AI 领域的核心知识体系。

面向 **AI 爱好者、半吊子技术人员和非技术背景的学习者**——不需要机器学习背景，从"会用"开始，按需深入原理。

**涵盖 5 大领域 · 15 个方向 · 74 个核心主题**

![知识图谱截图](docs/screenshot.png)

## 特性

### 知识图谱
- **全局总览**：双环布局，5 大类 + 15 方向 + 74 主题全部一屏可见，掌握状态实时着色
- **领域浏览**：逐层展开（大类 → 方向 → 主题），力导向图布局
- **路径导览**：按学习意图选择线性路径（详见下方）

### 学习路径
两条按**意图**划分的线性路径，每条 12 步，点击步骤直接跳转到图谱对应位置：

| 路径 | 适合人群 | 覆盖内容 |
|---|---|---|
| **会用** | 想把 AI 高效用起来 | LLM 边界认知 → 提示工程 → RAG → Agent → MCP → Skill → 工作流自动化 |
| **懂原理** | 想理解 AI 底层机制 | 线性代数 → 神经网络 → Transformer → 预训练 → SFT → RLHF → PEFT |

### 测评系统
- **全局诊断**：30 题覆盖全部 15 个方向，生成雷达图 + 薄弱方向分析 + 推荐下一步
- **方向测评**：针对单一方向深度测评（每方向多题），题目按难度排序
- **即时判分**：选择后立即显示正误和解析

### 导出分发
- **Obsidian Vault**：一键下载含 wikilinks 和掌握状态的 Obsidian 知识库
- **Anki 卡片**：Quiz 题目导出为 CSV，导入 Anki 做间隔复习
- **纯 Markdown**：无平台锁定，可导入 Notion、Logseq 等任意工具

### 其他
- **知识搜索**：模糊搜索名称、标签、描述，快速定位知识点
- **进度看板**：五大领域掌握度概览，热力图 + 雷达图
- **日 / 夜主题**：顶部切换，偏好保存至本地
- **课程探索**：生成 CLI 提示词，用本地 AI Agent 深入探索任意知识点

## 快速开始

### 方式一：一键启动（推荐）

```bash
git clone https://github.com/ZominWang/super-alignment.git
cd super-alignment
bash run.sh
```

浏览器访问 [http://localhost:5001](http://localhost:5001)

> 首次运行自动创建虚拟环境、编译知识库数据并启动 HTTP 服务器。

### 方式二：手动构建

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python build.py                    # 编译知识库
cd web && python3 -m http.server 5001
```

### 方式三：构建时导出分发文件

```bash
python build.py --export all       # 同时生成 Obsidian Vault + Anki CSV + Markdown
python build.py --export obsidian  # 仅 Obsidian
python build.py --export anki      # 仅 Anki
python build.py --export markdown  # 仅 Markdown
```

导出文件在 `exports/` 目录下。

### 方式四：部署到 GitHub Pages / 静态托管

```bash
python build.py
# 将 web/ 目录直接推送到 Pages，或用任何静态托管服务
```

## 项目结构

```
knowledge_graph/
├── vault/                      # 知识库（Markdown 格式，唯一内容源）
│   ├── areas/      (5)         # 大类
│   ├── directions/ (15)        # 方向
│   ├── topics/    (74)         # 主题（含知识点描述 + 选择题组）
│   └── paths/     (2)          # 学习路径（YAML）
├── web/                        # 纯静态前端
│   ├── index.html              # 入口页面
│   ├── static/
│   │   └── js/
│   │       ├── data.js         # 编译生成的知识数据
│   │       ├── api-shim.js     # API 适配层（本地计算替代 Flask）
│   │       ├── app.js          # 图谱渲染、测评交互、路径导览
│   │       ├── export.js       # 浏览器端导出（Obsidian/Anki/Markdown）
│   │       └── i18n.js         # 中/英双语
│   └── services/               # Python 解析模块（供 build.py 使用）
├── exports/                    # 构建时导出的分发文件
├── build.py                    # 编译脚本 + 导出
├── requirements.txt            # 构建依赖（仅 build.py 需要）
└── run.sh                      # 一键启动
```

## 知识结构

| 大类 | 方向 | 代表主题 |
|---|---|---|
| 基础理论 | 数学基础、机器学习、深度学习 | 线性代数、Transformer 架构、监督学习 |
| 大语言模型 | 模型架构、训练与优化、推理部署 | 注意力机制、SFT、RLHF、模型量化 |
| 应用技术 | 提示工程、RAG、AI Agent | 上下文工程、RAG 基础、MCP 协议、Skill 构建 |
| 工程实践 | 开发框架、MLOps、测评与质量 | AI 辅助编程、模型选型、LangChain、成本优化 |
| 安全与对齐 | 对齐技术、AI 安全、治理与伦理 | Constitutional AI、提示注入、数据隐私 |

## 扩展知识库

所有知识内容存储在 `vault/topics/`，每个主题是一个 Markdown 文件：

```markdown
---
id: your_topic_id
name: 主题名称
name_en: Topic Name
area: application
direction: agent
difficulty: 2          # 1-5，1 最简单
importance: 5          # 1-5，5 最重要
prerequisites: [agent_basics]
tags: [agent, mcp]
---

知识点描述（1-2 句话）...

## Quiz

### Q1
**问题**: 题目内容？

- A. 选项A
- B. 正确选项  ✓
- C. 选项C
- D. 选项D

**解析**: 选B的原因...
```

新增或修改主题后，运行 `python build.py` 重新编译即可生效。

## 技术栈

- **内容**：Markdown + YAML frontmatter（单一真相源）
- **构建**：Python 3（一次编译，生成静态 JS 数据文件）
- **前端**：原生 JavaScript + D3.js v7，零框架，零后端
- **运行时**：纯静态 HTML/JS/CSS，可用任何 HTTP 服务器
- **状态**：浏览器 localStorage（每台机器独立）

## 设计哲学

本项目定位为 **"AI 知识导航层 + 内容分发引擎"**，而非笔记工具。

- **内容即数据**：Markdown 文件是唯一真相源，构建脚本将其编译为静态 JSON
- **只做地图，不做目的地**：提供知识全景图、学习路径、测评推荐，深度笔记留给用户自己的工具
- **多端分发**：同一套内容，编译为 Web 图谱、Obsidian Vault、Anki 卡片、纯 Markdown 四种形态

## License

MIT
