---
id: "adv_rag"
name: "高级RAG技术"
name_en: "Advanced RAG Techniques"
type: "topic"
level: 3
area: "application"
direction: "rag"
prerequisites: ["rag_basics", "embeddings"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["rag", "advanced-rag", "hyde", "self-rag", "reranking", "corrective-rag", "query-rewrite", "hybrid-search"]
---

高级 RAG 在基础"检索→生成"流程上引入多层优化：查询改写、HyDE（假设文档嵌入）提升检索召回，重排序（Reranking）精化结果，Self-RAG 让模型自主判断是否需要检索并对检索结果进行反思验证，将 RAG 从能用（basic）推向好用（production-ready）。

## Quiz

### Q1
**问题**: HyDE（Hypothetical Document Embeddings）的核心思路是什么？

- A. 用 LLM 对检索结果生成摘要，再对摘要进行二次检索
- B. 先让 LLM 根据问题生成一个假设性答案文档，用该文档的嵌入向量检索真实文档，解决问题与文档的语义不对称问题  ✓
- C. 在索引阶段为每个文档块生成假设性问题，用问题嵌入建立索引
- D. 利用 LLM 将用户查询扩展为多个同义问题，取所有问题嵌入的平均值检索

**解析**: 问题（用户提问）和答案（文档内容）的语义空间存在差异：用户问"transformer 注意力复杂度是多少"，而文档写"自注意力的时间复杂度为 O(n²)"。HyDE 的解决方案：让 LLM 先生成一个假设答案（"注意力机制的计算复杂度为 O(n²)..."），用这个假设答案的嵌入检索实际文档。假设答案与真实文档的语义更接近，检索召回率显著提升。Gao et al. (2022) 的实验显示 HyDE 在多个 QA 任务上超过传统密集检索。

### Q2
**问题**: 重排序（Reranking）在 RAG 流程中处于哪个位置，解决了什么问题？

- A. 在文档索引阶段对原始文档质量排序，优先索引高质量内容
- B. 在初步检索（召回大量候选）之后、最终送入 LLM 之前，用更精确但慢的模型精排 Top-K，解决向量检索"召回率高但精度不足"的问题  ✓
- C. 在 LLM 生成后对多个回答候选进行质量评分和排序
- D. 替代向量检索的全文搜索模块，直接返回最相关文档

**解析**: RAG 检索通常分两阶段：第一阶段（召回）用向量相似度快速从百万文档中找出 Top-50 候选，速度快但精度有限；第二阶段（精排）用 Cross-Encoder 重排序模型（如 Cohere Rerank、BGE-Reranker）对候选文档重新打分，选出真正最相关的 Top-5 给 LLM。Cross-Encoder 同时处理查询和文档，精度远高于双塔模型，但速度慢（不适合全量检索）。两阶段设计兼顾了效率与准确性。

### Q3
**问题**: Self-RAG 在标准 RAG 基础上增加了什么能力？

- A. 通过训练让模型能够自主决定是否需要检索、对检索结果进行相关性批判，并反思自己的输出是否有幻觉  ✓
- B. 让 RAG 系统能够实时爬取互联网而非依赖本地知识库
- C. 通过强化学习自动优化检索策略，无需人工设置检索超参数
- D. 允许模型在同一次推理中进行多轮检索，每轮检索基于上一轮的中间结论

**解析**: 标准 RAG 无论是否需要都执行检索，且不验证检索结果质量。Self-RAG（Asai et al. 2023）通过训练特殊的反思 token，让模型在生成过程中能插入：(1) 检索决策（是否需要检索？）；(2) 相关性判断（检索结果是否与问题相关？）；(3) 支持性判断（生成内容是否被检索文档支持？）；(4) 效用判断（最终回答是否有用？）。这使 RAG 从被动流水线变为主动自我监督系统，在 ASQA、PopQA 等任务上显著减少幻觉。

## 参考资料

### 论文
- **[Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection]** (Asai et al., 2023) — 提出反思 token 机制，使模型可自主决定是否检索并对结果进行批判性评估。https://arxiv.org/abs/2310.11511
- **[Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)]** (Gao et al., 2022) — 提出假设文档嵌入方法，通过生成假设答案弥合问题与文档的语义鸿沟。https://arxiv.org/abs/2212.10496
- **[Corrective Retrieval Augmented Generation (CRAG)]** (Yan et al., 2024) — 引入检索评估器和网络搜索补救机制，使 RAG 具备自我纠错能力。https://arxiv.org/abs/2401.15884

### 博文/教程
- **[Advanced RAG Techniques: An Illustrated Overview]** — Towards Data Science。系统梳理 HyDE、重排序、Self-RAG 等高级 RAG 技术的原理与工程实践。https://towardsdatascience.com/advanced-retrieval-augmented-generation-techniques-an-illustrated-overview
