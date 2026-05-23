---
id: "langchain"
name: "LangChain框架"
name_en: "LangChain Framework"
type: "topic"
level: 3
area: "engineering"
direction: "dev_frameworks"
prerequisites: ["rag_basics", "tool_use"]
difficulty: 2
importance: 3
status: "unknown"
tags: ["engineering", "langchain", "lcel", "chain", "agent"]
---

LangChain 是最主流的 LLM 应用开发框架，提供了链（Chain）、代理（Agent）、记忆（Memory）等抽象，以及与主流 LLM、向量数据库的集成。LCEL（LangChain Expression Language）使流水线声明式组合成为可能，LangSmith 提供 trace 和评估能力。

## Quiz

### Q1
**问题**: LangChain 的 LCEL（LangChain Expression Language）中 `|` 运算符表示什么？

- A. 逻辑或运算
- B. 将前一个组件的输出传递给后一个组件，构建声明式的处理链  ✓
- C. 并行执行两个组件
- D. 定义组件的备选方案

**解析**: LCEL 的 `chain = prompt | llm | output_parser` 等价于将 prompt、llm、output_parser 串联：prompt 的输出是 llm 的输入，llm 的输出是 output_parser 的输入。这种声明式语法使链的组合可读性强，同时内置了流式传输、批处理和异步支持。

### Q2
**问题**: LangChain 中 `ConversationBufferWindowMemory` 和 `ConversationSummaryMemory` 各自的适用场景是？

- A. Buffer 适合长对话，Summary 适合短对话
- B. Buffer 保留最近 K 轮对话（适合短期任务），Summary 用 LLM 摘要旧历史（适合长对话/成本控制）  ✓
- C. 两者只是 API 不同，功能完全相同
- D. Summary 需要更多内存

**解析**: BufferWindowMemory(k=5) 只保留最近 5 轮对话，超出的被丢弃，适合上下文不重要的简单任务。SummaryMemory 用 LLM 将旧对话压缩为摘要，保留语义精华，token 消耗相对稳定，适合长对话助手。两者都有对应的 Buffer+Summary 混合版本。

### Q3
**问题**: LangSmith 在 LLM 应用开发中解决什么问题？

- A. 提供更快的 LLM 推理服务
- B. 记录和可视化每次 LLM 调用的完整 trace（输入/输出/延迟/cost），支持调试和质量评估  ✓
- C. 自动优化 LangChain 的性能
- D. 替代向量数据库存储嵌入

**解析**: LLM 应用调试困难——一个用户请求可能触发 10+ 次 LLM 调用，中间结果难以追踪。LangSmith 自动捕获完整执行树：每次 LLM 调用的 prompt、response、延迟、token 数；工具调用的输入输出；运行成本。通过 trace 可以快速定位哪一步导致了错误，也可以建立评估数据集进行系统性测试。

## 参考资料

### 博文/教程
- **[LangChain 官方文档]** — LangChain。包含 LCEL、Chain、Agent、Memory、Retrieval 等核心模块的完整教程与 API 参考。https://python.langchain.com/docs/
- **[LangSmith Documentation]** — LangChain。LLM 应用可观测性平台的使用指南，涵盖 trace 调试、评估数据集构建与 CI/CD 集成。https://docs.smith.langchain.com
- **[LangChain Expression Language (LCEL) Guide]** — LangChain 官方博客。深入讲解 LCEL 声明式管道的设计理念、流式传输与异步支持。https://blog.langchain.dev/langchain-expression-language/
