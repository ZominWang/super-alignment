---
id: "advanced_rag"
name: "高级RAG与重排序"
name_en: "Advanced RAG & Reranking"
type: "topic"
level: 3
area: "application"
direction: "rag"
prerequisites: ["rag_basics", "vector_databases"]
difficulty: 3
importance: 4
status: "unknown"
tags: ["rag", "reranking", "query-rewriting", "advanced-rag", "HyDE"]
---

高级 RAG 技术针对标准 RAG 的缺陷进行改进，包括查询改写（HyDE/多查询扩展）、重排序（Cross-encoder Reranker）、RAG-Fusion、自适应检索（FLARE）等，系统性地提升检索准确率和生成质量。

## Quiz

### Q1
**问题**: HyDE（Hypothetical Document Embeddings）的工作原理是什么？

- A. 对用户查询进行同义词扩展后嵌入
- B. 先让 LLM 生成一个"假设性回答"文档，用该文档的嵌入检索，而非用查询嵌入检索  ✓
- C. 生成多个查询的假设并取平均嵌入
- D. 基于用户历史生成假设性查询

**解析**: 用户查询通常简短且与知识库文档风格不同（查询是问题，文档是答案）。HyDE 让 LLM 先生成一段符合知识库风格的"假设文档"，用它的嵌入去检索，弥合了"问题嵌入"和"答案嵌入"之间的语义鸿沟，显著提升检索召回率。

### Q2
**问题**: RAG 中的重排序（Reranking）步骤在检索管道中的位置和作用是什么？

- A. 重排序发生在文档摄取阶段，优化索引顺序
- B. 重排序在向量检索后，对 Top-K 候选（如 Top-20）用精度更高的 Cross-encoder 重新评分，筛选出最终 Top-N（如 Top-3）  ✓
- C. 重排序替代向量检索，直接对全库评分
- D. 重排序在生成阶段对多个候选答案排序

**解析**: 管道：向量检索（召回 Top-20，速度快）→ Cross-encoder Reranker（对每对(查询, 文档)精确评分）→ 选出 Top-3 放入上下文 → LLM 生成。Cross-encoder 能捕捉查询与文档的精细交互，但需要对每对单独运行，因此只能用于少量候选。Cohere Rerank、BGE-Reranker 是常用工具。

### Q3
**问题**: FLARE（Forward-Looking Active REtrieval）如何解决标准 RAG 的哪个问题？

- A. 解决文档过多时的检索效率问题
- B. 解决单次检索不足以回答多跳问题的问题，通过在生成过程中按需动态触发多次检索  ✓
- C. 解决嵌入模型质量不佳的问题
- D. 解决 LLM 的幻觉问题

**解析**: 标准 RAG 只在回答开始前检索一次。对于需要多步推理的问题（"A 的 CEO 是谁，他之前在哪家公司工作？"），一次检索无法获取所有信息。FLARE 在生成过程中监测模型的不确定性（低置信度 token），遇到不确定点时暂停生成，检索相关信息后继续，实现多轮迭代检索。
