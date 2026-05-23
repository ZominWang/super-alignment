---
id: "basic_prompting"
name: "基础提示设计"
name_en: "Basic Prompt Design"
type: "topic"
level: 3
area: "application"
direction: "prompt_eng"
prerequisites: ["pretrained_lm"]
difficulty: 1
importance: 5
status: "unknown"
tags: ["prompting", "system-prompt", "instruction", "context"]
---

基础提示设计是与 LLM 有效交互的核心技能。明确的角色设定（System Prompt）、清晰的任务指令、充分的上下文信息和适当的输出约束，是构建高质量提示的四大要素，直接决定了 LLM 应用的效果上限。

## Quiz

### Q1
**问题**: 在系统提示（System Prompt）中定义 AI 角色和行为约束的主要目的是什么？

- A. 减少模型的推理计算量
- B. 建立会话的全局行为规范，使模型在整个对话中保持一致的角色、格式和限制  ✓
- C. 替代用户每次的详细指令
- D. 确保模型使用特定的编程语言

**解析**: System Prompt 设定"元规则"：角色（你是一个专业的数据分析师）、格式（始终用中文回答，使用 Markdown）、限制（只回答与数据分析相关的问题）。这些规则作用于整个对话，让每条 User Message 不需要重复说明这些基本要求。

### Q2
**问题**: 提示词中"给 LLM 充分的上下文"和"提示词尽量简短"之间如何权衡？

- A. 永远应该最简短，LLM 能自动推断上下文
- B. 提供任务完成所必需的背景信息，但避免无关细节；上下文的质量比数量更重要  ✓
- C. 应该提供尽可能多的上下文，越详细越好
- D. 使用模板固定长度，不根据任务调整

**解析**: LLM 无法获取提示词中未给出的信息。缺少关键上下文（如"用户的职业背景"）会导致模型做出错误假设。但过长的无关信息会稀释关键指令，引入"注意力分散"效应。原则：给足必要背景，省略可以自明的内容。

### Q3
**问题**: 以下哪种指令写法能更有效地控制 LLM 的输出格式？

- A. "请用好的格式回答"
- B. "请用 JSON 格式输出，包含 'summary'（字符串）和 'keywords'（字符串数组）两个字段"  ✓
- C. "请格式化你的回答"
- D. "请参考上面的格式"

**解析**: LLM 对模糊指令（"好的格式"）的理解因模型而异。精确的格式规范（字段名、数据类型、示例）大幅减少格式不一致的情况。在生产系统中，通常进一步结合 JSON Schema 约束或工具调用的 `response_format` 参数来强制格式。

## 参考资料

### 博文/教程
- **[Prompt Engineering Guide]** — Anthropic 官方文档。系统介绍清晰指令、角色设定、格式约束、输出控制等提示设计最佳实践，以 Claude 为示例但原则通用。https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
- **[Prompt Engineering Guide]** — OpenAI 官方文档。介绍 GPT 系列模型的提示技巧，涵盖系统提示、few-shot 示例、思维链等策略，与 Anthropic 指南互为补充。https://platform.openai.com/docs/guides/prompt-engineering
- **[Prompt Engineering Guide]** — DAIR.AI（Elvis Saravia）。开源的提示工程综合指南，涵盖零样本、少样本、CoT、ReAct 等多种技术，并持续更新最新研究进展。https://www.promptingguide.ai

### 课程
- **[ChatGPT Prompt Engineering for Developers]** — Isa Fulford & Andrew Ng / DeepLearning.AI（免费）。覆盖迭代提示、摘要、推理、转换、扩写等核心应用场景，含配套 Jupyter Notebook，2小时完成，是提示工程入门首选课程。https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/
- **[Anthropic Cookbook]** — Anthropic 官方实战 notebook 集合。涵盖角色设定、格式控制、多轮对话、工具调用等大量可直接运行的示例，是贴近 Claude 实际开发的最佳实操资源。https://github.com/anthropics/anthropic-cookbook
- **[Anthropic Prompt Engineering Interactive Tutorial]** — Anthropic 官方课程（免费）。9章交互式教程，覆盖角色提示、XML标签、思维链、格式控制与幻觉规避等核心技巧，直接在 Claude API 上运行，是最贴近实战的提示工程系统课。https://github.com/anthropics/courses/tree/master/prompt_engineering_interactive_tutorial
