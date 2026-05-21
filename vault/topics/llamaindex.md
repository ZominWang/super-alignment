---
id: "llamaindex"
name: "LlamaIndex"
name_en: "LlamaIndex"
type: "topic"
level: 3
area: "engineering"
direction: "dev_frameworks"
prerequisites: ["rag_basics"]
difficulty: 2
importance: 4
status: "unknown"
tags: ["engineering", "llamaindex", "rag", "index", "query-engine"]
---

LlamaIndex（原 GPT Index）专注于将私有数据连接到 LLM，提供了比 LangChain 更精细的数据摄取和索引能力。VectorStoreIndex、SummaryIndex、KnowledgeGraphIndex 是三种主要索引类型，RouterQueryEngine 支持智能路由到不同数据源。

## Quiz

### Q1
**问题**: LlamaIndex 的 `Node` 对象相比原始文本块（chunk）增加了哪些重要信息？

- A. Node 只是文本块的别名，没有额外信息
- B. Node 包含文本内容、元数据（来源、位置）、与其他 Node 的关系（父子、前后）和嵌入向量  ✓
- C. Node 仅包含嵌入向量，不包含原始文本
- D. Node 是 LlamaIndex 对 LangChain Document 的重命名

**解析**: LlamaIndex 的 Node 是一等公民，包含：(1) text（文本内容）；(2) metadata（文件名、页码、作者等）；(3) relationships（prev_node/next_node/parent_node，支持层次结构）；(4) embedding（可选，生成后缓存）。这些关系使层次检索（如先找章节再找段落）成为可能。

### Q2
**问题**: LlamaIndex 的 `SentenceWindowNodeParser` 的工作原理和优势是什么？

- A. 按句子分割文档，每个句子是一个 Node
- B. 将文档分割为句子，但在检索时同时返回目标句子前后的窗口句子，兼顾检索精准性和上下文完整性  ✓
- C. 使用滑动窗口选择最相关的句子组合
- D. 将相邻句子合并成更大的块

**解析**: 纯句子分割精准但上下文太短，纯大块检索召回准确但上下文噪音多。SentenceWindowNodeParser：嵌入粒度是单个句子（精准匹配），检索后将返回该句子及其前后 k 个句子（上下文丰富）。这种"细粒度索引+粗粒度检索"策略显著提升了 RAG 质量。

### Q3
**问题**: LlamaIndex 的 `RouterQueryEngine` 如何工作，适用什么场景？

- A. 将查询路由到不同的 LLM 模型
- B. 根据查询内容，动态选择最合适的索引或工具（如向量索引、摘要索引、SQL查询），实现多数据源智能路由  ✓
- C. 将查询分发给多个 Agent 并行处理
- D. 根据用户权限限制查询范围

**解析**: 若系统包含多个数据源（产品文档、财务数据库、FAQ），RouterQueryEngine 使用 LLM（或关键词匹配）判断查询属于哪类，路由到对应索引：事实查询→向量索引；摘要查询→SummaryIndex；结构化查询→SQLDatabase。这避免了对所有数据源统一查询的噪音和成本。
