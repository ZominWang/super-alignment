---
id: "context_engineering"
name: "上下文工程"
name_en: "Context Engineering"
type: "topic"
level: 3
area: "application"
direction: "prompt_eng"
prerequisites: ["basic_prompting", "chain_of_thought"]
difficulty: 2
importance: 5
status: "unknown"
tags: ["context", "context-window", "memory", "chunking", "prompt-engineering", "agent"]
---

上下文工程是指有意识地设计和管理送入模型的信息：什么内容放进去、放多少、以什么顺序、如何压缩。随着应用复杂度增加，简单地"把所有信息塞进 prompt"会导致上下文溢出、注意力稀释、成本飙升。掌握上下文管理策略，是从"能用 AI"到"会用 AI 构建应用"的关键分水岭。

## Quiz

### Q1
**问题**: 在构建多轮对话应用时，随着对话轮数增加，以下哪种上下文管理策略最平衡效果和成本？

- A. 保留所有历史对话，不做任何处理（完整记忆）
- B. 只保留最后一条用户消息，丢弃所有历史
- C. 保留最近N轮对话 + 对更早内容做摘要压缩，关键信息不丢失但 token 数可控  ✓
- D. 每次对话都重新开始，不保留任何上下文

**解析**: 上下文管理的核心矛盾是"记忆完整性"vs"token成本和窗口限制"。保留全部历史成本随轮数线性增长，最终超出窗口限制。只保最后一条则丢失关键背景。"滑动窗口+摘要"是工业界常见策略：最近几轮完整保留（细节准确），更早的内容由模型压缩成摘要（保留要点），在有限token预算内最大化有效信息密度。

### Q2
**问题**: 以下哪项"上下文污染"场景会最严重地影响LLM输出质量？

- A. System prompt 写得太长（超过500字）
- B. 在上下文中混入大量与当前任务无关的文档或聊天记录，导致模型"注意力"被稀释  ✓
- C. 用户消息使用了非正式语气
- D. 在上下文末尾而非开头放置指令

**解析**: LLM对上下文中的信息并非均等关注——它更容易被大量无关内容"带偏"，在冗余信息中遗漏关键指令（"Lost in the Middle"现象）。研究表明，重要内容放在上下文的开头或结尾比放中间效果更好。上下文工程的一个核心原则是：只放当前任务真正需要的内容，保持信息密度。

### Q3
**问题**: RAG系统中将文档分块（Chunking）时，以下哪个说法最准确？

- A. 块越小越好，因为检索精度更高
- B. 块越大越好，因为提供给模型的上下文更完整
- C. 分块大小应根据文档结构和查询类型平衡：需要细节的查询用小块，需要理解整体逻辑的查询用大块或层级分块  ✓
- D. 分块大小对RAG效果没有明显影响

**解析**: 分块是RAG上下文工程的核心问题。小块（128-256 tokens）检索精准但缺少上下文，模型可能无法理解片段意义；大块（512-1024 tokens）提供完整上下文但检索召回率可能下降且浪费token。最佳实践：按文档自然边界（段落、章节）分块；使用小块索引+大块送入模型（"parent document retriever"模式）；或使用层级索引（摘要索引+原文）。

## 参考资料

### 论文
- **[Lost in the Middle: How Language Models Use Long Contexts]** (Nelson F. Liu et al., 2023) — 实证研究 LLM 对上下文中不同位置信息的利用情况，发现"中间遗失"现象，对上下文信息排布策略有直接指导意义。https://arxiv.org/abs/2307.03172

### 博文/教程
- **[LangChain: Memory and Context Management]** — LangChain 官方文档。介绍对话历史管理、摘要记忆、向量记忆等上下文工程方案的实现方式，提供可直接使用的代码示例。https://docs.langchain.com/docs/
- **[Context Engineering for Agents]** — Anthropic 工程博客。从 Agent 系统设计角度讲解如何有效管理工具结果、历史对话和系统指令的上下文编排，是构建生产级 Agent 的实践参考。https://www.anthropic.com/engineering

### 课程
- **[Building Systems with the ChatGPT API]** — Isa Fulford & Andrew Ng / DeepLearning.AI（免费）。系统讲解多步系统中的上下文管理、对话历史维护与输出控制策略，以构建完整客服机器人为主线，含可运行代码。https://www.deeplearning.ai/short-courses/building-systems-with-chatgpt/
- **[Anthropic Real World Prompting]** — Anthropic 官方课程（免费）。以真实生产场景（客服、文档问答、数据提取）为主线，讲解上下文信息的结构化组织、动态注入与长窗口管理，是上下文工程最贴近实战的系统教程。https://github.com/anthropics/courses/tree/master/real_world_prompting
