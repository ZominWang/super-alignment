---
id: "agentic_rag"
name: "Agentic RAG"
name_en: "Agentic RAG"
type: "topic"
level: 4
area: "application"
direction: "rag"
prerequisites: ["rag_basics", "self_rag", "agent_basics", "tool_use"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["agentic-rag", "agent", "retrieval", "self-rag", "corrective-rag"]
---

Agentic RAG 将 Agent 的自主决策能力与 RAG 检索增强融合，让 LLM 从被动的"检索→回答"管线升级为主动的"判断→检索→自评→纠正→回答"智能体。与传统 RAG 不同，LLM 自行决定何时触发检索、检索什么内容、是否需要多步检索以及如何对检索结果进行自我评判。Self-RAG 通过特殊反思 token（Retrieve/ISREL/ISSUP/ISUSE）实现按需检索与生成质量控制；Corrective RAG 在检索后引入自我纠错机制，对低质量文档进行知识精炼和二次检索；Adaptive RAG 根据查询复杂度动态选择检索策略（单步/多步/不检索）。多步 Agentic 检索涉及将复杂查询分解为子问题、规划检索顺序、综合多源信息，形成从"检索一次"到"检索智能体"的范式跃迁。

## Quiz

### Q1
**问题**: Self-RAG 的核心创新是什么？

- A. 使用多个向量数据库并行检索，取并集提高召回率
- B. 训练 LLM 生成特殊的反思 token（Retrieve/ISREL/ISSUP/ISUSE），在推理时根据 token 决定是否检索、检索结果是否相关、是否支持生成内容  ✓
- C. 在 RAG 流程后增加一个评估 LLM 做事实核验
- D. 使用图谱增强检索而非纯向量检索

**解析**: Self-RAG（Asai et al., 2023）在 LLM 的词汇表中添加特殊 token：`<Retrieve>` 触发检索，`<ISREL>` 判断检索段落是否与问题相关，`<ISSUP>` 判断是否支持生成内容，`<ISUSE>` 判断生成文本的整体质量。这些 token 通过训练数据中的标注习得，推理时 LLM 根据这些 token 动态决定检索时机和生成可靠性，实现了内生自评而非依赖外部评估器。

### Q2
**问题**: Corrective RAG（CRAG）相比标准 RAG 的关键改进是什么？

- A. 使用更大的嵌入模型提高检索精度
- B. 在检索后引入"检索评估器"，对检索到的文档打分，低分文档触发知识精炼（将文档分解为知识条并过滤噪音）和 Web 搜索补充；若所有文档均低质量则直接搜索  ✓
- C. 使用 Contextual Retrieval 而非语义检索
- D. 将检索结果和生成结果拼接后重新编码

**解析**: CRAG（Yan et al., 2024）的核心流程：(1) 检索评估器对每个文档计算置信度分数；(2) 若分数整体高（>阈值），直接基于文档生成；(3) 若分数模糊（介于阈值之间），启动知识精炼（Knowledge Refinement）——从文档中提取知识陈述、过滤冗余和矛盾信息、重组精炼知识；(4) 若分数整体低，绕过检索直接执行 Web 搜索。这个自我纠错回路显著提升了检索结果的可靠性。

### Q3
**问题**: Agentic RAG 与传统 RAG 在架构上的本质区别是什么？

- A. Agentic RAG 使用更强的 LLM，传统 RAG 使用弱 LLM
- B. 传统 RAG 是固定的"检索→生成"线性管线；Agentic RAG 将检索变为可迭代的 Agent 工具调用，LLM 自主规划检索策略、评估结果、决定是否重新检索或执行其他动作  ✓
- C. Agentic RAG 不需要向量数据库，传统 RAG 必须使用
- D. 两者在架构上没有本质区别，Agentic RAG 只是多添加了一些提示词

**解析**: 传统 RAG 将检索视为固定步骤：用户查询 → 检索 Top-K → 拼接上下文 → LLM 生成。Agentic RAG 赋予 LLM 决策自主权：分析查询 → 判断是否需要检索 → 生成搜索查询 → 评估结果 → 决定是否重试/细化/切换数据源 → 综合回答。这与 ReAct 模式一致——检索不再是管线的一环，而是 Agent 的 Tool，支持循环调用和条件分支，从根本上改变了系统架构。

## 参考资料

### 论文
- **[Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection]** (Asai, Wu, Wang, Sil, Hajishirzi, 2024) — 通过特殊反思 token 实现按需检索、段落评估、生成自检的端到端训练。https://arxiv.org/abs/2310.11511
- **[Corrective Retrieval Augmented Generation]** (Yan, Mao, Ji, 2024) — CRAG，引入检索评估器，对低质量文档触发知识精炼和 Web 搜索补充。https://arxiv.org/abs/2401.15884
- **[Adaptive-RAG: Learning to Adapt Retrieval-Augmented Large Language Models through Question Complexity]** (Jeong, Baek, Park, 2024) — 根据查询复杂度动态选择检索策略（不检索/单步/多步）。https://arxiv.org/abs/2403.14403
- **[ReAct: Synergizing Reasoning and Acting in Language Models]** (Yao, Zhao, Yu, 2023) — 提出 Reasoning+Acting 交替模式，奠定 Agentic 交互范式基础。https://arxiv.org/abs/2210.03629

### 博文/教程
- **[Agentic RAG: What It Is and How to Build It]** — LlamaIndex Blog。https://www.llamaindex.ai/blog/agentic-rag-with-llamaindex
- **[Self-RAG 论文解读]** — Towards Data Science。https://towardsdatascience.com/self-rag-learning-to-retrieve-generate-and-critique-through-self-reflection/

### 开源项目
- **[LangGraph]** — LangChain 出品的 Agent 编排框架，天然支持多步检索工作流。https://github.com/langchain-ai/langgraph
- **[Self-RAG 官方实现]** — 含训练数据和评估脚本。https://github.com/AkariAsai/self-rag

### 课程
- **[Building Agentic RAG with LlamaIndex]** — Jerry Liu / DeepLearning.AI（免费）。实战构建多步骤 Agentic RAG 系统，含路由器、子问题查询引擎、反思循环与工具调用，是 Agentic RAG 工程化的核心实操课。https://www.deeplearning.ai/short-courses/building-agentic-rag-with-llamaindex/
- **[Anthropic Building Effective Agents — Orchestrator-Subagent 模式]** — Anthropic 官方课程（免费）。Orchestrator 指挥多个 RAG 子 Agent 的完整实现，是 Agentic RAG 中 Agent 调度层设计的权威参考，含 Claude API notebook。https://github.com/anthropics/courses/tree/master/building_effective_agents
