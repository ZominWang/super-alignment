---
id: "llm_capabilities"
name: "LLM能力与边界认知"
name_en: "LLM Capabilities & Limitations"
type: "topic"
level: 3
area: "llm"
direction: "llm_arch"
prerequisites: []
difficulty: 1
importance: 5
status: "unknown"
tags: ["llm", "capabilities", "hallucination", "reasoning", "limitations", "practical"]
---

理解大语言模型能做什么、不能做什么，是使用 AI 工具的第一步。LLM 擅长文本理解、生成、推理和知识提取，但存在幻觉（生成虚假内容）、知识截止日期、数学推理弱等固有局限。清楚这些边界，才能正确设定预期、有效使用 AI，避免把 LLM 用在它不擅长的地方。

## Quiz

### Q1
**问题**: 下列哪项最准确描述了LLM"幻觉"（Hallucination）问题？

- A. LLM 只在被问到它不知道的问题时才会编造答案
- B. LLM 会生成听起来合理但实际上不正确的内容，且往往表现得很自信，这种情况在各类问题中都可能发生  ✓
- C. 幻觉问题已经被 ChatGPT-4 完全解决
- D. LLM 编造内容时会自动给出警告提示

**解析**: 幻觉是指LLM生成了语法流畅、看似合理但实际不准确或虚假的内容。它不局限于"不知道的问题"——即使是LLM训练过的领域也会幻觉。模型不会主动标记自己的幻觉。这是为什么对AI生成的事实性内容，尤其是数字、引用、法律医疗内容，必须人工核实的原因。

### Q2
**问题**: 以下哪个任务最适合用LLM独立完成，不需要额外验证？

- A. 计算一道涉及多步骤的数学题（如复杂积分）
- B. 查询昨天的股票收盘价格
- C. 将一段英文合同条款改写成更易理解的中文说明  ✓
- D. 判断一份法律文件是否符合最新法规

**解析**: LLM在文本改写、风格调整、语言转换方面表现稳定，失误率低——这是它的强项。数学推理（尤其多步骤）容易出错；实时数据查询超出训练截止日期；法律判断需要最新法规且错误代价高。选C是因为改写质量人类能立即判断，且即便有轻微偏差也无严重后果。

### Q3
**问题**: 用户想让LLM帮助分析一份上周刚发布的政策文件，应该如何操作最合理？

- A. 直接问LLM"这份政策的主要内容是什么"，LLM会自动获取最新信息
- B. 把政策文件的内容粘贴到对话中，让LLM基于提供的文本进行分析  ✓
- C. LLM有知识截止日期，所以完全无法处理新文件，应该放弃使用AI
- D. 先让LLM搜索这份文件，再进行分析

**解析**: LLM处理新内容的正确方式是：把内容直接粘贴到上下文中。LLM没有实时联网能力（除非特别集成了搜索工具），它的"知识"来自训练数据。但LLM完全可以分析用户提供的文本——这是它最擅长的任务之一。知识截止日期影响的是LLM"记忆"中的事实，不影响它对当前对话中内容的理解和分析能力。

## 参考资料

### 论文
- **[Sparks of Artificial General Intelligence: Early experiments with GPT-4]** (Sébastien Bubeck et al., 2023) — 微软研究院对 GPT-4 能力的系统评估，探讨其在推理、多模态、编程等任务中涌现出的类 AGI 能力与局限。https://arxiv.org/abs/2303.12712
- **[Beyond the Imitation Game: Quantifying and Extrapolating the Capabilities of Language Models (BIG-Bench)]** (Srivastava et al., 2022) — 大规模 LLM 能力评测基准，包含 200+ 任务，系统衡量 LLM 在常识推理、数学、语言理解等多维度的能力边界。https://arxiv.org/abs/2206.04615

### 博文/教程
- **[Hallucination Leaderboard]** — Vectara。持续追踪主流 LLM 在事实性任务上的幻觉率，帮助开发者量化评估不同模型的幻觉问题。https://github.com/vectara/hallucination-leaderboard

### 课程
- **[Generative AI for Everyone]** — Andrew Ng / DeepLearning.AI（免费）。面向所有人的 GenAI 入门课，系统介绍 LLM 能力边界、工作原理与实际应用场景，无需编程基础，是"会用"路线的第一门课。https://www.deeplearning.ai/courses/generative-ai-for-everyone/
- **[ChatGPT Prompt Engineering for Developers]** — Isa Fulford & Andrew Ng / DeepLearning.AI（免费）。在实操中直接感知 LLM 在不同任务上的能力范围与限制，含配套 Jupyter Notebook。https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/
- **[Anthropic API Fundamentals]** — Anthropic 官方课程（免费）。通过 Claude API 的实际调用理解 LLM 的能力边界：文本理解与生成、视觉输入、工具调用、长上下文处理，是感知模型真实能力的第一手实操材料。https://github.com/anthropics/courses/tree/master/anthropic_api_fundamentals
