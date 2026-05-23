---
id: "rag_basics"
name: "RAG基础架构"
name_en: "RAG Fundamentals"
type: "topic"
level: 3
area: "application"
direction: "rag"
prerequisites: ["embeddings", "basic_prompting"]
difficulty: 2
importance: 5
status: "unknown"
tags: ["rag", "retrieval", "generation", "pipeline", "context"]
---

RAG（检索增强生成）将外部知识库与 LLM 结合，解决 LLM 知识截止、幻觉和领域知识不足的问题。标准 RAG 流程包括文档摄取（分块、嵌入、存储）和查询阶段（检索、提示构建、生成），是企业 AI 应用最主流的架构模式。

## Quiz

### Q1
**问题**: RAG 相比直接将所有知识放入系统提示（Long Context）的主要优势是什么？

- A. RAG 的回答质量总是更高
- B. RAG 按需检索相关片段，避免超出上下文窗口限制，同时降低推理成本和"迷失在中间"问题  ✓
- C. RAG 不需要向量数据库
- D. RAG 可以实时爬取互联网

**解析**: 若知识库有 1000 页文档，全部塞入上下文不仅超出 token 限制，还会引发"Lost in the Middle"问题（LLM 对中间内容关注度低）。RAG 只检索 Top-K 相关片段（通常 3-10 段），上下文精准集中，成本低。但 RAG 引入了检索失败的风险：若关键信息未被检索到，答案质量会大幅下降。

### Q2
**问题**: RAG 系统中"幻觉"（Hallucination）发生的典型原因是什么？

- A. LLM 生成的文字过多
- B. 检索到的上下文与问题不相关，LLM 依赖参数知识填补空白，产生不准确内容  ✓
- C. 向量数据库索引损坏
- D. 系统提示过长导致注意力分散

**解析**: RAG 幻觉通常发生在：(1) 相关文档未被索引；(2) 检索召回率低（正确文档排名靠后被截断）；(3) 问题歧义导致检索错误。LLM 对提示中上下文过度自信，即使上下文无关也可能"发挥"生成看似合理的错误答案。解决方案：改善检索、引用溯源、答案验证。

### Q3
**问题**: RAG 系统的"摄取阶段"（Ingestion Pipeline）主要包括哪些步骤？

- A. 训练嵌入模型、微调 LLM、部署向量数据库
- B. 文档加载→文本提取→分块→嵌入→存储到向量数据库，同时可建立元数据索引  ✓
- C. 数据标注→模型训练→评估→部署
- D. 用户问题收集→答案生成→人工标注→模型更新

**解析**: 完整摄取流程：(1) 加载文档（PDF/Word/HTML等）；(2) 提取纯文本；(3) 按策略分块（固定大小/语义/层次）；(4) 调用嵌入模型生成向量；(5) 存储向量和原始文本到向量数据库。元数据（来源、日期、章节）可用于过滤检索，提升精准度。

## 参考资料

### 论文
- **[Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks]** (Lewis et al., 2020) —— RAG 起源论文，提出将检索与生成结合的框架解决知识密集型任务。https://arxiv.org/abs/2005.11401
- **[Retrieval-Augmented Generation for Large Language Models: A Survey]** (Gao et al., 2023) —— RAG 领域全面综述，涵盖范式、增强方法和评估。https://arxiv.org/abs/2312.10997

### 视频（B站/YouTube）
- **[RAG From Scratch]** —— LangChain 官方视频系列，从零开始讲解 RAG 系统的各组件实现（索引、检索、生成、多查询、RAG Fusion 等共15集）。https://youtube.com/@LangChain

### 博文/教程
- **[LangChain RAG 教程]** —— LangChain 官方文档，涵盖文档加载、分块、检索、生成完整流程。https://python.langchain.com/docs/tutorials/rag/

### 课程
- **[LangChain: Chat with Your Data]** — Harrison Chase / DeepLearning.AI（免费）。从文档加载到完整 RAG 问答系统的端到端实战，覆盖 PDF、网页、Notion 等多种数据源，是 RAG 上手的最佳第一课。https://www.deeplearning.ai/short-courses/langchain-chat-with-your-data/
- **[HuggingFace NLP Course — RAG 章节]** — Hugging Face（免费）。以 HuggingFace 生态为核心，系统讲解 FAISS 向量索引构建、DPR 检索器训练与 RAG 问答系统的端到端实现，是理解 RAG 底层机制的权威教材。https://huggingface.co/learn/nlp-course/
- **[Anthropic Cookbook — RAG 示例]** — Anthropic 官方。包含基于 Claude 的 RAG 系统完整实现，含文档分块策略、嵌入向量生成与 Claude 作为生成器的集成示例。https://github.com/anthropics/anthropic-cookbook
