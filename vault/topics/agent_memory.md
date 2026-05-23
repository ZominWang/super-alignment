---
id: "agent_memory"
name: "Agent记忆与规划"
name_en: "Agent Memory & Planning"
type: "topic"
level: 3
area: "application"
direction: "agent"
prerequisites: ["tool_use"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["agent", "memory", "planning", "long-term", "episodic"]
---

Agent 记忆系统将短期上下文扩展为长期持久化存储，规划能力使 Agent 能够将复杂目标分解为可执行步骤。情节记忆（对话历史）、语义记忆（知识库）、程序记忆（工具使用技能）是三种不同类型，规划算法（如 Plan-and-Execute）是复杂任务的关键。

## Quiz

### Q1
**问题**: 长期记忆在 Agent 系统中通常如何实现？

- A. 通过无限延长上下文窗口
- B. 将关键信息摘要后存储到外部数据库（如向量库或键值存储），按需检索注入上下文  ✓
- C. 训练一个专门的记忆模块
- D. 使用更大的模型参数存储记忆

**解析**: 上下文窗口有限（即使 128K 也会耗尽），且填满上下文会降低注意力质量。实用的长期记忆方案：对话历史摘要（rolling summary）、关键事实提取后存向量库（情节记忆）、用户偏好/任务结果存键值数据库。MemGPT 的分层记忆系统是这一思路的代表。

### Q2
**问题**: Plan-and-Execute 架构与 ReAct 的核心区别是什么？

- A. Plan-and-Execute 使用更多工具
- B. Plan-and-Execute 先生成完整计划再逐步执行，而 ReAct 是边执行边动态决策下一步  ✓
- C. Plan-and-Execute 不需要工具调用
- D. ReAct 总是比 Plan-and-Execute 更好

**解析**: ReAct 在每步都重新规划，适合不确定性高的任务，但可能失去全局视野。Plan-and-Execute 先生成完整行动计划（Planner），再逐步执行（Executor），适合步骤清晰的长任务，可以提前发现逻辑错误。实践中常结合使用：高层计划 + 执行中的动态调整。

### Q3
**问题**: Agent 的"上下文压缩"（Context Compression）解决什么问题，如何实现？

- A. 减少 Agent 的工具调用次数
- B. 随着对话/任务推进，历史信息填满上下文窗口，压缩通过摘要或提取关键信息保留有效信息  ✓
- C. 压缩 LLM 的模型权重以减少内存
- D. 减少每次工具调用的返回数据量

**解析**: 长任务中，早期的工具调用结果和对话历史会占满上下文。压缩策略：(1) 滚动摘要（Summarize）：用 LLM 将旧历史压缩为摘要；(2) 选择性保留：只保留与当前子任务相关的历史；(3) 外部记忆：将重要信息存入向量库按需检索。LangChain 的 ConversationSummaryMemory 是典型实现。

## 参考资料

### 论文
- **[MemGPT: Towards LLMs as Operating Systems]** (Packer et al., 2024) — 提出分层记忆系统，仿照操作系统的内存管理思想，让 LLM 实现跨会话的持久长期记忆。https://arxiv.org/abs/2310.08560
- **[Cognitive Architectures for Language Agents]** (Sumers et al., 2024) — 系统综述 Agent 的记忆、规划、行动三大模块，建立认知架构的统一理论框架。https://arxiv.org/abs/2309.02427

### 博文/教程
- **[LLM Powered Autonomous Agents]** — Lilian Weng（OpenAI）。深度解析 Agent 的记忆类型（感知、短期、长期）与规划算法，是该领域最权威的入门综述博文。https://lilianweng.github.io/posts/2023-06-23-agent/
