---
id: "graph_rag"
name: "Graph RAG知识图谱增强检索"
name_en: "Graph RAG"
type: "topic"
level: 3
area: "application"
direction: "rag"
prerequisites: ["rag_basics", "embeddings"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["graph-rag", "knowledge-graph", "graphrag", "entity-extraction", "community-detection"]
---

Graph RAG（Graph Retrieval-Augmented Generation）是针对传统 RAG"局部检索、逐片段回答"模式在全局性问题上不足的改进方案——当用户问"这个数据集的主要主题是什么"或"文档之间的关联如何"时，传统 RAG 只能检索到零散片段，难以形成宏观概括。微软 GraphRAG 框架提供了一条完整的知识图谱增强检索管线：用 LLM 从文档中提取实体和关系 → 构建知识图谱 → Leiden 社区发现算法检测社区 → 为每个社区生成摘要 → 问答时通过 Map-Reduce 范式将全局摘要与局部关联信息融合，实现从"文档片段"到"知识结构"的跃迁。与传统 RAG 的向量相似度检索不同，Graph RAG 的检索环境包括：实体的语义邻居、所属社区摘要、以及多跳路径推理。

GraphRAG 的适用场景明确——全局性问题（如"整个文档集讨论了哪些科学领域"）、多跳推理问题（如"A 与 B 通过何种机制连接"）、关系型查询（如"这种药物与哪些并发症有关"）；而在事实精确定位、关键词匹配等局部性问题上，传统 RAG 可能更快更准。GraphRAG 的局限也很显著：构建图谱和社区摘要需要大量 LLM Token 调用（处理百万 token 级文档可能消耗数百万 Token），成本高；实体/关系提取的质量严重依赖于所选 LLM 的能力；图谱结构和社区检测结果对超参数（prompt 设计、社区分辨率）敏感。LightRAG 等变体在效率和图谱更新上做了改进，KAG（Knowledge Augmented Generation）则结合知识图谱推理和向量检索。关键论文：Edge et al. 2024 "From Local to Global: A Graph RAG Approach to Query-Focused Summarization"。

## Quiz

### Q1
**问题**: 微软 GraphRAG 使用 Leiden 社区发现算法的目的是什么？

- A. 检测文档中的重复段落
- B. 在知识图谱中发现紧密关联的实体群组（社区），为每个社区生成全局摘要，使得在回答宏观问题时能提供结构化概览 ✓
- C. 优化向量数据库的索引结构
- D. 评估实体提取的质量

**解析**: 构建完实体关系图谱后，图中可能包含数千个实体和关系，直接提供原始图谱给 LLM 是不可行的（超出上下文窗口）。Leiden 算法通过优化模块度（modularity），将图谱划分为若干"社区"——社区内部关系紧密、社区间关系稀疏，每个社区对应文档中一个相对独立的主题群（如"糖尿病治疗的药物研究"）。对每个社区生成一份摘要后，这些摘要成为回答"这个数据集讨论了哪些主题"等宏观问题的核心信息源。Leiden 相比 Louvain 算法保证连通性（社区内部图连通），且速度更快。

### Q2
**问题**: 以下哪种问题最适合用 Graph RAG 而非传统 RAG（向量检索+片段生成）？

- A. "2023 年诺贝尔物理学奖得主是谁"——事实精确查找
- B. "请总结本文档集中关于气候变化讨论的主要流派及其相互关联"——需要宏观结构、跨片段关系建模 ✓
- C. "这段代码第三行的函数名是什么"——局部精确匹配
- D. "翻译以下英文段落为中文"——翻译任务

**解析**: 传统 RAG 擅长"大海捞针"式精确定位和短程依赖：问题 B 如果直接用向量检索，可能找到几十个提到"气候变化"的片段，但它们之间缺乏层次结构和逻辑关联，LLM 拼凑这些片段易产出扁平化、碎片化的回答。Graph RAG 通过社区摘要预先生成了"宏观地图"，回答时以地图为纲，再按需深入到具体实体和关系，天然适合"概览+细节融合"的全局推理问题。对于事实查询（A），传统 RAG 的向量检索反而更快速精准。

### Q3
**问题**: Graph RAG 相比传统 RAG 的主要额外成本来源是什么？

- A. 需要更强性能的 GPU 进行向量计算
- B. 构建知识图谱时需要大量 LLM 调用进行实体/关系提取，以及社区摘要生成，文档规模越大成本越高 ✓
- C. 需要人工标注实体和关系
- D. 需要更快的网络带宽

**解析**: GraphRAG 的索引阶段（Indexing Phase）远比传统 RAG 昂贵。传统 RAG：分块 → 嵌入化 → 存向量库（主要成本是嵌入 API 费用，相对低廉）。GraphRAG：分块 → 对每个 chunk 调用 LLM 提取 (实体, 类型, 描述) + (头实体, 关系, 尾实体) → 去重和合并 → 实体/关系嵌入化 → Leiden 聚类 → 对每个社区调用 LLM 生成摘要。每一步 LLM 调用都累积 Token 成本。以 1GB 文本为例，GraphRAG 的构建成本可达传统 RAG 的 20-50 倍。这也是当前 GraphRAG 难以直接应用于超大规模语料的原因之一。

## 参考资料

### 论文
- **[From Local to Global: A Graph RAG Approach to Query-Focused Summarization]** (Edge, Trinh, Cheng, 2024) — 微软 GraphRAG 框架论文，提出实体提取→Leiden 社区发现→社区摘要的完整管线。https://arxiv.org/abs/2404.16130
- **[LightRAG: Simple and Fast Retrieval-Augmented Generation]** (Guo, Xia, Yu, 2024) — 轻量级 Graph RAG 变体，引入图向量双重索引，降低图谱构建成本。https://arxiv.org/abs/2410.05779
- **[KAG: Boosting LLMs in Professional Domains via Knowledge Augmented Generation]** (Liang, Wang, Zhu, 2024) — 结合知识图谱推理与向量检索，面向专业领域知识增强。https://arxiv.org/abs/2409.13252

### 博文/教程
- **[GraphRAG: Unlocking Large-Scale LLM-Powered Q&A]** — Microsoft Research Blog。https://www.microsoft.com/en-us/research/blog/graphrag-unlocking-llm-discovery-on-narrative-private-data/
- **[GraphRAG 官方文档]** — Microsoft。https://microsoft.github.io/graphrag/

### 开源项目
- **[graphrag]** — 微软 GraphRAG 官方 Python 实现，支持全局/局部搜索。https://github.com/microsoft/graphrag
- **[LightRAG]** — 轻量级 Graph RAG 开源实现。https://github.com/HKUDS/LightRAG

### 课程
- **[Knowledge Graphs for RAG]** — Neo4j / DeepLearning.AI（免费）。实战构建基于知识图谱的 RAG 系统，涵盖 Cypher 查询语言、图结构检索策略与 LLM 的结合方式，是 Graph RAG 最系统的动手课程。https://www.deeplearning.ai/short-courses/knowledge-graphs-rag/
