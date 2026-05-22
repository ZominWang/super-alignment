# AI 知识图谱

一个可本地运行的 AI / LLM / Agent 知识学习系统。通过交互式知识图谱、诊断测评和进度追踪，帮助你系统掌握 AI 领域的核心知识体系。

**涵盖 5 大领域 · 15 个方向 · 60 个核心主题**

![知识图谱截图](docs/screenshot.png)

## 功能

- **知识图谱**：三级可视化图谱（大类 → 方向 → 主题），点击节点逐层展开，掌握度实时着色
- **诊断测评**：30 题全局诊断（每方向 2 题），测评结果生成雷达图和薄弱方向分析
- **方向测评**：针对单一方向的深度测评（每方向 12 题）
- **进度看板**：五大领域掌握度概览，已掌握 / 学习中 / 需要加强 / 未测评 分类统计
- **知识搜索**：按名称、标签、描述模糊搜索，快速定位知识点

## 快速开始

**环境要求**：Python 3.8+，无需其他外部服务

```bash
# 1. 克隆项目
git clone https://github.com/ZominWang/super-alignment.git
cd knowledge_graph

# 2. 启动（首次运行自动创建虚拟环境并安装依赖）
bash run.sh
```

浏览器访问 [http://localhost:5001](http://localhost:5001)

> 首次启动会自动执行 `python3 -m venv venv` 和 `pip install -r requirements.txt`，无需手动操作。

## 手动安装（可选）

如果不用 `run.sh`：

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd web
python app.py
```

## 项目结构

```
knowledge_graph/
├── vault/                  # 知识库（Markdown 格式）
│   ├── areas/     (5)      # 大类：基础理论、大语言模型、应用技术、工程实践、安全与对齐
│   ├── directions/ (15)    # 方向：如 RAG、Agent、数学基础、MLOps…
│   └── topics/    (60)     # 主题：每个文件含知识描述 + 选择题
├── web/
│   ├── app.py              # Flask 后端
│   ├── vault_parser.py     # 数据解析与状态管理
│   ├── recommender.py      # 学习路径推荐
│   ├── data/               # 运行时状态（state.json，不进 git）
│   ├── static/             # JS / CSS
│   └── templates/          # HTML 模板
├── requirements.txt
└── run.sh                  # 一键启动脚本
```

## 知识结构

| 大类 | 方向（示例） |
|---|---|
| 基础理论 | 数学基础、机器学习、深度学习 |
| 大语言模型 | LLM 架构、LLM 训练、LLM 推理 |
| 应用技术 | RAG、Agent、提示词工程、开发框架 |
| 工程实践 | MLOps、评估与质量 |
| 安全与对齐 | AI 安全、对齐、AI 治理 |

## 扩展知识库

所有知识内容存储在 `vault/` 目录，每个主题是一个 Markdown 文件，格式如下：

```markdown
---
id: your_topic_id
name: 主题名称
name_en: Topic Name
area: foundations
direction: math
difficulty: 3
importance: 4
prerequisites: [linear_algebra]
tags: [数学, 基础]
---

知识点描述...

## Quiz

### Q1
题目内容？

- A. 选项A
- B. 选项B (correct)
- C. 选项C
- D. 选项D

> 解析：选 B 的原因…
```

按此格式在对应目录新增文件，重启服务即可自动加载。

## 技术栈

- **后端**：Python 3 + Flask 3
- **前端**：原生 JavaScript + D3.js v7
- **数据**：Markdown + YAML frontmatter（无数据库）
- **状态**：本地 JSON 文件，每个用户独立

## 用户数据

运行时产生的学习进度保存在 `web/data/state.json`（已加入 `.gitignore`），每台机器独立存储，不会上传至 git。

## License

MIT
