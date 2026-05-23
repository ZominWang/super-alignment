---
id: "structured_output"
name: "结构化输出与提示优化"
name_en: "Structured Output & Prompt Optimization"
type: "topic"
level: 3
area: "application"
direction: "prompt_eng"
prerequisites: ["chain_of_thought"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["prompting", "structured-output", "json", "prompt-optimization", "DSPy"]
---

结构化输出将 LLM 的自由文本转化为可编程处理的格式（JSON、XML等），是生产系统的必备技术。提示优化（Prompt Optimization）通过系统化方法而非直觉调整提示词，DSPy 等框架实现了提示词的自动优化。

## Quiz

### Q1
**问题**: OpenAI 的 `response_format: {type: "json_object"}` 和 JSON Schema 约束的主要区别是？

- A. 前者更严格，后者更宽松
- B. json_object 仅保证输出可解析的 JSON，JSON Schema 进一步约束字段结构和数据类型  ✓
- C. JSON Schema 只在 GPT-4 上有效
- D. 两者完全相同

**解析**: `json_object` 模式确保输出是合法 JSON，但字段名和类型不受控。JSON Schema（Structured Output）使用语法约束在解码时强制执行模式（通过约束采样/逻辑偏置），字段名、数据类型、必填字段都被严格保证，几乎消除了解析失败的情况。

### Q2
**问题**: 函数调用（Function Calling / Tool Use）与提示词要求 JSON 输出的本质区别是什么？

- A. 函数调用只能调用外部API，JSON 输出可以做任何事
- B. 函数调用通过模型原生训练确保结构正确性和意图识别，同时支持调用外部工具的完整 Agent 循环  ✓
- C. 函数调用更慢，JSON 提示更快
- D. 两者没有实质区别

**解析**: 提示词要求 JSON 输出：模型可能拒绝、格式可能不一致、需要额外解析验证。函数调用：模型经过专门训练来识别"何时调用工具"和"如何填充参数"，工具参数通过 JSON Schema 约束，且 API 层提供原生解析，还支持多工具选择和结果注入的完整循环。

### Q3
**问题**: DSPy 框架的"编译"（Compile）步骤在提示优化中做什么？

- A. 将 Python 代码编译为更快的字节码
- B. 基于少量训练示例和评估指标，自动搜索最优提示模板和 Few-shot 示例组合  ✓
- C. 将多个模型的提示词合并
- D. 压缩提示词以减少 token 消耗

**解析**: DSPy（Khattab 等，2023）将 LLM 程序定义为模块化的 Signatures（输入→输出），Compile 步骤使用少量带标签示例作为训练集，通过 BootstrapFewShot 等优化器在提示空间中搜索（自动选择示例、调整指令措辞），找到在验证集上指标最优的提示配置，无需人工迭代提示词。

## 参考资料

### 论文
- **[DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines](https://arxiv.org/abs/2310.03714)** (Khattab et al., 2023) — 提出 DSPy 框架，将 LLM 程序定义为声明式模块并通过编译自动优化提示和少样本示例，是结构化输出与提示优化领域的重要工作。https://arxiv.org/abs/2310.03714
- **[Outlines: Efficient Guided Generation for LLMs](https://arxiv.org/abs/2307.09702)** (Willard & Louf, 2023) — 提出通过有限状态机约束 LLM 解码过程以保证输出格式正确性的方法，是结构化输出约束采样的核心算法论文。https://arxiv.org/abs/2307.09702

### 博文/教程
- **[Instructor: Structured LLM Outputs](https://python.useinstructor.com/)** — Instructor 库官方文档。基于 Pydantic 模型从 LLM 提取结构化数据，支持 OpenAI、Anthropic 等多个后端，提供完整的使用教程和最佳实践。
- **[JSON Schema Official Specification](https://json-schema.org/)** — JSON Schema 官方规范网站。定义了 JSON 数据的验证语法，是 OpenAI Structured Output、工具调用参数约束等功能的底层标准。
