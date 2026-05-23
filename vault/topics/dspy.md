---
id: "dspy"
name: "DSPy编程框架"
name_en: "DSPy Programming Framework"
type: "topic"
level: 4
area: "application"
direction: "prompt_eng"
prerequisites: ["basic_prompting", "chain_of_thought"]
difficulty: 4
importance: 3
status: "unknown"
tags: ["dspy", "prompt-optimization", "programmatic", "compiler", "stanford"]
---

DSPy（Declarative Self-improving Python）是 Stanford 开发的声明式 LLM 编程框架，将提示工程从手工试错转变为"编程 + 编译器优化"范式。核心抽象包括：Signature（声明输入输出字段及语义，替代手写 prompt 模板）、Module（可组合的 LLM 调用单元，如 dspy.ChainOfThought、dspy.Predict、dspy.ReAct）和 Optimizer/Teleprompter（通过标注数据自动优化 prompt 和 few-shot 示例，如 BootstrapFewShot 从成功执行中提取示例、MIPROv2 联合优化指令和示例）。使用者只需定义任务 Signature 和评估指标，Compiler 自动编译出高性能的 prompt 策略。典型场景：十几行 DSPy 代码即可替代数百行手工调整的 LangChain prompt 模板，且编译后的程序可跨模型迁移保持性能。

## Quiz

### Q1
**问题**: DSPy 中 Signature 的作用是什么？

- A. 为 LLM 提供认证签名，确保调用安全
- B. 声明式定义任务的输入输出字段（如 "question -> answer"）和字段语义描述，替代手工编写 prompt 模板；DSPy 编译器根据 Signature 自动组装最佳指令和格式  ✓
- C. 指定使用哪个 LLM 模型
- D. 对训练数据进行数字签名防止篡改

**解析**: DSPy 的 Signature 类似于函数的类型签名。例如 `"context, question -> rationale, answer"` 定义了输入字段 context 和 question，输出字段 rationale 和 answer。每个字段可附带描述（如 `question = dspy.InputField(desc="the user's question")`）。编译器在优化时利用这些描述生成 instruction 和自动构建 few-shot 示例，用户无需手动设计 prompt 文本。

### Q2
**问题**: DSPy 的 BootstrapFewShot 优化器的工作原理是什么？

- A. 随机从训练集中采样 K 个样本作为 few-shot 示例
- B. 用当前的 prompt 程序在训练集上执行，收集执行成功的输入-输出对作为 few-shot 示例（"自举"），再加入新 prompt 中重新编译；同时自动调整示例在上下文窗口中的组织方式使其效果最优  ✓
- C. 使用梯度下降直接优化 prompt 的词嵌入
- D. 调用外部 LLM 为每个样本生成最佳 prompt

**解析**: BootstrapFewShot 的核心是"teacher-student"自举过程：程序在训练集的子集上多次运行，每次尝试生成正确输出，保留成功的（输入，输出）对作为候选示例。然后通过迭代测试选择最佳示例组合（数量、顺序、多样性），最终"编译"出一套针对该任务最优的 few-shot prompt。这个过程将手工筛选示例的工作完全自动化。

### Q3
**问题**: DSPy 与 LangChain 在设计哲学上的根本差异是什么？

- A. DSPy 使用 Python，LangChain 使用 JavaScript
- B. DSPy 是声明式+编译优化范式（定义"做什么"交由编译器优化"怎么做"），LangChain 是命令式+管线编排范式（开发者手动指定"怎么做"的每一步，包括 prompt 模板、链式调用、工具配置）  ✓
- C. DSPy 只能用于分类任务，LangChain 通用性强
- D. 两者功能完全相同，只是不同公司的产品

**解析**: LangChain 将 LLM 调用视为需要手动编排的管线——使用者要明确写 prompt 模板、选 LLM、串链、选检索器。DSPy 将 LLM 调用视为可编译的程序模块——使用者只需定义任务签名和评估指标，编译器自动找出最优的 prompt 策略和 few-shot 示例。这种"声明式编程 + 自动编译"使 DSPy 程序更简洁（代码量通常只有 LangChain 的 1/10）、更易维护（prompt 修改由编译器完成），且编译出的策略可跨 LLM 迁移并保持较好性能。

## 参考资料

### 论文
- **[DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines]** (Khattab et al., 2023) —— DSPy 框架论文，提出声明式编程 + 编译器优化范式替代手工提示工程。https://arxiv.org/abs/2310.03714

### 开源项目
- **[DSPy]** —— Stanford NLP 开发的声明式 LLM 编程框架，支持 Signature 定义、Module 组合和 Optimizer 自动编译。https://github.com/stanfordnlp/dspy

### 博文/教程
- **[DSPy 官方文档]** —— 包含快速入门、API 参考和最佳实践指南。https://dspy.ai/

### 课程
- **[DSPy 官方学习路径]** — Stanford NLP / DSPy 团队维护。从入门到进阶的完整教程，涵盖 Signature 定义、Module 组合、Optimizer 自动编译与评估，含配套 Colab notebook，是学习 DSPy 最系统的起点。https://dspy.ai/learn/
- **[Building Your Own Database Agent]** — DeepLearning.AI（免费）。以结构化数据问答为场景展示声明式提示优化替代手工调试的优势，直观体现 DSPy 解决的核心工程痛点。https://www.deeplearning.ai/short-courses/building-your-own-database-agent/
