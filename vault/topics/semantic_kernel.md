---
id: "semantic_kernel"
name: "Semantic Kernel框架"
name_en: "Semantic Kernel Framework"
type: "topic"
level: 3
area: "engineering"
direction: "dev_frameworks"
prerequisites: ["openai_api"]
difficulty: 3
importance: 2
status: "unknown"
tags: ["semantic-kernel", "microsoft", "dotnet", "enterprise", "plugin", "orchestration"]
---

Semantic Kernel (SK) 是 Microsoft 推出的企业级 AI 编排框架，核心理念是将 AI 能力封装为"技能插件"，与现有企业软件无缝集成。核心架构：Kernel 作为中央编排引擎，管理所有 Plugin（封装AI/O原生操作的函数集合）、Memory（语义记忆与向量存储）和 Planner（自动任务规划）。Plugin 分为 Semantic Plugin（用 prompt template 定义，通过 Handlebars 模板实现动态参数注入）和 Native Plugin（用 C#/Python/Java 编写的原生函数，通过 SK 桥接 LLM 调用）。Planner 通过 LLM 推理将用户意图分解为多个 Plugin 函数调用链并自动执行。Memory 模块通过 Embedding + 向量数据库实现长程语义记忆。与 LangChain 对比：SK 定位企业级 C# 场景，强调类型安全和 DI 依赖注入，与 Microsoft 365 Copilot 技术栈深度融合。

## Quiz

### Q1
**问题**: Semantic Kernel的Planner与传统工作流引擎的根本区别是什么？

- A. Planner运行速度更快
- B. Planner利用LLM的语义理解能力，将自然语言意图动态分解为Plugin函数调用链，而非依赖预定义的静态流程  ✓
- C. Planner只能处理简单的线性任务
- D. Planner需要手动编写规则

**解析**: SK Planner的工作机制：(1) 用户输入自然语言意图（如"把我今天的两封未读邮件摘要发送到Teams"）；(2) LLM解析意图，对照已注册Plugin的函数签名（如`SummarizeEmailPlugin.SummarizeAsync`、`TeamsPlugin.SendMessageAsync`）；(3) 自动生成执行计划：Step1:调用GetUnreadEmails→Step2:对每封调用Summarize→Step3:调用SendTeamsMessage；(4) Kernel按计划顺序执行，处理参数传递和类型转换。传统工作流引擎依赖预定义逻辑图，无法理解新的模糊意图。Planner的核心是让LLM充当"动态计划生成器"，实现意图到API的自然映射。

### Q2
**问题**: Semantic Kernel的Native Plugin函数在C#中的特征是什么，LLM如何"知道"调用哪个函数？

- A. 需要手写API文档
- B. 通过[KernelFunction]和[Description]特性装饰的函数，SK自动提取函数签名、参数类型和自然语言描述注入LLM上下文，LLM据此决定调用  ✓
- C. 所有C#函数自动成为Plugin
- D. LLM需要预先训练识别这些函数

**解析**: Native Plugin示例：`[KernelFunction, Description("获取指定股票代码的当前价格")] public async Task<decimal> GetStockPriceAsync([Description("股票代码，如MSFT")] string symbol) { ... }`。SK在运行时：(1) 反射提取函数的名称、Description、参数名称与Description；(2) 将这些信息组装为OpenAI Function Calling的Tools/Function定义；(3) 注入System Prompt，LLM看到所有可用函数及其语义描述；(4) LLM输出Function Call JSON时，Kernel反序列化参数（类型安全转换+验证）并调用真正的C#函数。这种设计将强类型企业代码与LLM灵活调度结合，是SK区别于LangChain的关键——LangChain以Python动态类型为基础，SK强调编译时类型安全。

### Q3
**问题**: Microsoft 365 Copilot的技术架构与Semantic Kernel的关系是什么？

- A. 两者完全独立，使用不同的技术栈
- B. Semantic Kernel是Copilot的底层编排引擎，Copilot通过SK的Plugin架构连接Microsoft Graph（邮件/日历/文档）等企业数据源，实现自然语言到企业操作的映射  ✓
- C. Copilot是SK的前身
- D. SK只用于Copilot的UI层

**解析**: Microsoft 365 Copilot的技术栈：顶层是用户自然语言接口，中间层是Semantic Kernel负责意图解析、规划与执行编排，底层通过Microsoft Graph API连接Word/Excel/Teams/Outlook等365应用数据。SK的Plugin模型天然适配：每个365应用封装为一个Native Plugin（如`OutlookPlugin.SendEmail()`），记忆系统使用Microsoft Graph索引用户文档。这种架构实现了：用户说"起草一份基于昨天的会议纪要的项目计划"→SK Planner解析意图→调用Graph获取昨天的会议记录→调用GPT-4生成计划→反馈给用户。SK在整个链条中扮演"神经中枢"。

## 参考资料

### 博文/教程
- **[Semantic Kernel Documentation]** — Microsoft。SK 的官方文档，涵盖 Kernel、Plugin（Semantic/Native）、Planner、Memory 等核心概念及 C#/Python 示例。https://learn.microsoft.com/en-us/semantic-kernel/
- **[Semantic Kernel GitHub]** — Microsoft。SK 开源代码库，包含丰富的示例项目（企业助手、RAG Pipeline、多 Agent 协作），同时维护活跃的社区讨论。https://github.com/microsoft/semantic-kernel
- **[Building AI Plugins with Semantic Kernel]** — Microsoft 技术博客。深入介绍如何用 SK Plugin 将企业现有 API 接入 Copilot 生态，实现自然语言驱动的业务流程自动化。https://devblogs.microsoft.com/semantic-kernel/

