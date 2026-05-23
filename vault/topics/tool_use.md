---
id: "tool_use"
name: "工具调用与函数调用"
name_en: "Tool Use & Function Calling"
type: "topic"
level: 3
area: "application"
direction: "agent"
prerequisites: ["agent_basics"]
difficulty: 2
importance: 4
status: "unknown"
tags: ["agent", "tool-use", "function-calling", "api", "code-execution"]
---

工具调用（Tool Use）使 LLM 能够与外部世界交互：搜索引擎、数据库、代码执行、API 调用。OpenAI 的函数调用（Function Calling）为工具调用提供了规范化接口，通过 JSON Schema 定义工具参数，是构建 AI Agent 的核心能力。

## Quiz

### Q1
**问题**: OpenAI 函数调用中，`tool_choice: "auto"` 和 `tool_choice: "required"` 的区别是什么？

- A. auto 更快，required 更慢
- B. auto 让模型自主决定是否调用工具，required 强制模型必须调用至少一个工具  ✓
- C. required 限制只能调用一个工具，auto 可以调用多个
- D. 两者只是命名不同，功能相同

**解析**: `auto`（默认）：模型根据用户请求判断是否需要工具，如"你好"会直接回答，"搜索最新新闻"会调用搜索工具。`required`：强制模型必须调用工具，适合需要确保使用工具的场景（如数据提取管道）。`none` 禁用所有工具调用。

### Q2
**问题**: 工具的 JSON Schema 描述中，`description` 字段对 LLM 最重要的作用是什么？

- A. 用于生成 API 文档
- B. LLM 根据 description 判断何时调用该工具，以及如何正确填充参数，描述质量直接影响工具使用准确率  ✓
- C. description 只供开发者阅读，不影响 LLM 行为
- D. 控制工具调用的频率

**解析**: LLM 通过 description 理解工具的用途和参数含义。好的描述：清晰说明工具做什么、何时使用、参数的具体格式（如"日期格式为YYYY-MM-DD"）。模糊的描述会导致误用。每个参数的 `description` 同样关键——"query: 搜索关键词"远比"query: the query"更有用。

### Q3
**问题**: 并行工具调用（Parallel Tool Calling）的适用场景和潜在风险是什么？

- A. 并行调用适合所有场景，总是比串行更好
- B. 适合独立任务（如同时查天气和股价），但对有依赖关系的任务会导致错误（用未知参数调用后续工具）  ✓
- C. 并行工具调用只在多 GPU 环境下有效
- D. 并行调用不支持错误处理

**解析**: GPT-4 支持在一次响应中返回多个工具调用。独立任务（获取多城市天气）可以并行，大幅减少延迟。但若工具 B 需要工具 A 的输出作为输入，并行调用会失败。Agent 框架需要建立工具调用的依赖图，正确安排并行/串行顺序。

## 参考资料

### 论文
- **[Toolformer: Language Models Can Teach Themselves to Use Tools]** (Schick et al., 2023) —— 提出 Toolformer，让 LLM 通过自监督方式学会自主调用 API 工具。https://arxiv.org/abs/2302.04761
- **[Tool Learning with Foundation Models]** (Qin et al., 2023) —— 工具学习领域综述，涵盖工具使用、工具制造和工具增强。https://arxiv.org/abs/2304.08354

### 博文/教程
- **[OpenAI Function Calling 文档]** —— OpenAI 官方函数调用指南，介绍如何使用工具调用和结构化输出。https://platform.openai.com/docs/guides/function-calling

### 课程
- **[Functions, Tools and Agents with LangChain]** — Harrison Chase / DeepLearning.AI（免费）。全面覆盖 OpenAI Function Calling、LangChain Tool 封装、多工具路由与 Agent 执行器，是工具调用工程化的核心实操课。https://www.deeplearning.ai/short-courses/functions-tools-agents-langchain/
- **[Anthropic Tool Use Cookbook]** — Anthropic 官方。包含单工具调用、多工具并行调用、工具链与工具结果处理的完整可运行 notebook，是 Claude API 工具调用的最佳实战参考。https://github.com/anthropics/anthropic-cookbook/tree/main/tool_use
- **[Anthropic Tool Use Course]** — Anthropic 官方课程（免费）。结构化讲解工具定义（JSON Schema）、单工具/多工具/并行工具调用、工具结果注入与错误处理，含完整 notebook，是 Claude 工具调用从零到生产的系统教程。https://github.com/anthropics/courses/tree/master/tool_use
