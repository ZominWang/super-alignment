---
id: "ragas"
name: "RAGAS与检索评估"
name_en: "RAGAS & Retrieval Evaluation"
type: "topic"
level: 3
area: "engineering"
direction: "eval_quality"
prerequisites: ["rag_basics", "llm_evaluation"]
difficulty: 3
importance: 1
status: "unknown"
tags: ["evaluation", "ragas", "rag-evaluation", "faithfulness", "context-precision"]
---

RAGAS（RAG Assessment）提供了专门针对 RAG 系统的评估指标，包括忠实度（Faithfulness）、答案相关性（Answer Relevance）、上下文精准率（Context Precision）和上下文召回率（Context Recall），无需人工标注即可系统评估 RAG 管道各个组件。

## Quiz

### Q1
**问题**: RAGAS 的"忠实度（Faithfulness）"指标衡量什么？

- A. 检索到的文档与查询的相关性
- B. 生成答案中每个陈述是否都有检索上下文的支撑，衡量幻觉程度  ✓
- C. 模型回答的流畅程度
- D. 用户对答案的满意度

**解析**: Faithfulness = 上下文支撑的陈述数 / 答案中的总陈述数。得分 = 1 表示答案完全基于检索上下文（无幻觉）；得分 < 1 说明存在从参数知识"发挥"的内容。RAGAS 用 LLM 将答案分解为原子性陈述，再逐一判断是否有上下文支撑。

### Q2
**问题**: RAGAS 的"上下文精准率（Context Precision）"和"上下文召回率（Context Recall）"分别衡量什么？

- A. 精准率衡量检索数量，召回率衡量检索速度
- B. 精准率衡量检索到的文档中有多少是实际相关的，召回率衡量所有相关文档中有多少被检索到  ✓
- C. 两者都衡量生成答案的质量
- D. 精准率衡量检索器性能，召回率衡量 LLM 性能

**解析**: Context Precision：若检索了 5 个文档但只有 3 个用于生成答案，精准率 = 3/5 = 0.6（低精准率 = 引入无关干扰）。Context Recall：若相关的 5 个文档中只检索到了 4 个，召回率 = 4/5 = 0.8（低召回率 = 关键信息缺失）。两者权衡决定了最优的 Top-K 值。

### Q3
**问题**: 为什么 RAGAS 的无参考评估（Reference-free Evaluation）在实际应用中很重要？

- A. 无参考评估速度更快
- B. 大多数生产场景缺少人工标注的黄金答案，无参考评估使持续监控大量生产数据成为可能  ✓
- C. 无参考评估更准确
- D. 只有无参考评估能处理开放域问题

**解析**: 构建人工标注的测试集耗时耗力，且无法覆盖所有生产查询。RAGAS 的 Faithfulness、Answer Relevance 等指标不需要参考答案（只需查询、检索上下文、生成答案三元组），可以自动应用于每条生产数据，实现 24/7 的质量监控，而非仅在发布前做一次离线评估。
