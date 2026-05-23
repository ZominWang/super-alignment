---
id: "autogen_crewai"
name: "AutoGen与CrewAI框架"
name_en: "AutoGen and CrewAI Frameworks"
type: "topic"
level: 3
area: "engineering"
direction: "dev_frameworks"
prerequisites: ["agent_basics", "multi_agent", "langchain"]
difficulty: 2
importance: 3
status: "unknown"
tags: ["autogen", "crewai", "multi-agent", "microsoft", "orchestration"]
---

AutoGen 和 CrewAI 是当前多 Agent 应用开发的两大主流框架，代表了"对话驱动"与"流程编排"两种设计哲学。Microsoft AutoGen（v0.7+）的核心理念是将一切都视为异步消息传递的 Agent——每个 Agent 实现了标准的消息处理接口，通过 Agent Runtime（一个 Grpc-based 的分布式消息总线和 Event Loop）管理 Agent 间通信。关键模式：(1) ConversableAgent——基础抽象，任何能收发消息、处理消息、调用工具的实体（LLM Agent、人类、工具执行器）；(2) GroupChat——多个 Agent 在群聊中依次发言，由 GroupChatManager 控制发言顺序和流转；(3) SelectorGroupChat——LLM 作为"交通指挥"动态决定下一个发言的 Agent；(4) 强大的代码生成和执行能力——Agent 可以写代码、执行代码、根据执行结果调试，天然适合自动化编程任务；(5) Human-in-the-Loop 通过 UserProxyAgent 原生支持。AutoGen 的核心优势在于对话的涌现性——没有被硬编码的流程，Agent 自由对话中可能出现意想不到的解决方案。

CrewAI 的设计哲学截然不同：以业务流程编排为核心，借鉴了公司组织结构——"Crew" 是一支 Agent 团队，"Role" 定义 Agent 的职责和背景（"你是资深市场分析师，擅长竞品分析"），"Task" 定义需要完成的工作单元（包含描述、期望输出、分配给哪个 Role），"Process" 定义任务执行流程：(1) Sequential——任务按顺序执行，前一个的输出作为下一个的上下文；(2) Hierarchical——增设 Manager Agent 负责任务分解和委派。CrewAI 的 Tool 集成通过 @tool 装饰器声明，与 LangChain 的 Tool 生态良好对接。选型建议：AutoGen 适合探索性和创造性场景——你不知道最佳流程是什么，放手让 Agent 聊出方案；任务不可预定义，需要 Agent 动态协商；代码生成和执行是核心需求。CrewAI 适合确定性和可重复的场景——业务流程清晰且需要一致性；任务可预先分解为明确的角色分配；需要严格的执行顺序和质量把控。AutoGen 更灵活但输出可预测性低，CrewAI 更可靠但灵活性受限——两者互补而非替代。

## Quiz

### Q1
**问题**: AutoGen 的 GroupChat 模式中，如何解决"多个 Agent 无限循环发言"的问题？

- A. 限制每个 Agent 只能发言一次
- B. 通过 SelectorGroupChat 或自定义 Speaker Selection Function：LLM（或规则函数）基于对话历史和当前状态动态选择下一个发言者，并在满足终止条件（如某个 Agent 说了特定关键词、"任务完成"信号、达到最大轮次）时停止 ✓
- C. 要求所有 Agent 同时发言后取投票结果
- D. 由人类手动选择下一个发言者

**解析**: GroupChat 不设固定发言顺序，这带来了灵活性但可能导致：
(1) 无限循环（两个 Agent 来回辩论永不休止）；
(2) 偏离主题（Agent C 在讨论需求的时候突然岔开话题）。
解决方案通常在 Speaker Selection 层面：AutoGen 允许自定义 speaker_selection_method="round_robin"（轮转）或 "auto"（LLM 驱动的动态选择），后者让 LLM 在每一步选择"接下来最适合发言的 Agent"。终止条件可以组合使用：max_round=10（硬限制）、is_termination_msg（检测到特定回复如 "TERMINATE"）、自定义终止函数（检查是否完成了所有必需的工具调用）。v0.7+ 版本的 SelectorGroupChat 将这些机制内建为可配置的策略。

### Q2
**问题**: CrewAI 的 "Role" 设计中，Role 不仅仅是一个标签——它实际影响 Agent 行为的哪些方面？

- A. 只有 Agent 的名字会改变，不影响行为
- B. Role 的 5 个维度（Role Description, Goal, Backstory, Tools, Verbose/Allow Delegation）被编译为系统提示的核心部分，直接决定 Agent 的"个性"、输出风格、可用工具集以及是否可以将任务委派给他人——本质上是用结构化的方式做 Prompt Engineering ✓
- C. Role 决定 Agent 使用的 LLM 模型类型
- D. Role 只影响 Agent 的 UI 显示样式

**解析**: CrewAI 的 Role 是对 Prompt 的结构化编码：
- Description: "你是一位经验丰富的数据科学家，专注于时间序列分析" → 写入系统提示的背景设定段
- Goal: "找出销售数据中的季节性趋势并生成可视化报告" → 写入任务指令段
- Backstory: "你曾在某电商公司带领团队建立预测模型..." → 增加角色设定的丰富度和语气
- Tools: 赋予特定工具列表（搜索、Python REPL、数据库查询），限制 Action Space
- Allow Delegation: 是否可以把子任务"扔"给别人
这个设计使得 Prompt 构建从"手写一段话"变为"填写结构化字段"，降低了构建复杂 Agent 角色的门槛，但也在灵活性上做了妥协——如果你想创造的工具使用模式不在预定义字段内，需要回退到原生 Prompt。

### Q3
**问题**: 在一个"给定 API 文档，自动生成完整的 SDK 库"的任务中，为什么 AutoGen 比 CrewAI 更适合？

- A. 因为这个任务有明确的步骤，CrewAI 的 Sequential Process 更适合
- B. 因为这个任务需要代码生成与执行的紧密循环：Agent 写代码 → 执行 → 看报错 → 自动修复 → 再执行，这种非线性的迭代调试过程在 AutoGen 的对话驱动模型中更自然——两个 Agent（Coder + Executor）可以直接对话协作，而 CrewAI 的任务流难以优雅处理"执行失败后回退重试"这种分支逻辑 ✓
- C. CrewAI 不支持代码执行
- D. 两者完全等价，选择任意一个都可以

**解析**: 代码生成与调试是一个典型的"涌现型"而非"流程型"任务——你无法预先知道哪个函数会出错、需要几轮修复、修复过程中是否需要查阅更多 API 文档。AutoGen 的对话模型天然适合：Coder Agent 写代码 → Executor Agent 在沙箱执行 → 如果报错，Executor 把错误信息发回 Coder → Coder 修改代码 → 再次执行... 这个循环的轮数和内容是动态的、由对话驱动而非预定义流程。CrewAI Sequential Process 的问题：Task 2 "实现 SDK" 依赖 Task 1 "分析 API 文档" 的完成，但编码→调试→修复这个内循环怎么建模？要拆成 3 个 Task 吗？每次调试失败都要重新走一遍流程吗？这就是为什么"对话驱动"在某些场景中比"流程驱动"更自然——对话模型天然支持非线性交互。

## 参考资料

### 论文
- **[AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation]** (Wu et al., 2023) — 提出 AutoGen 框架，以可对话的多 Agent 协作范式构建 LLM 应用，展示了代码生成、辩论、工具调用等多种场景。https://arxiv.org/abs/2308.08155

### 博文/教程
- **[CrewAI Documentation]** — CrewAI 官方文档。详细说明 Crew、Agent、Task、Process 的设计概念与工程用法。https://docs.crewai.com
- **[AutoGen Documentation]** — Microsoft AutoGen 官方文档。涵盖 v0.4+ 的 AgentChat、GroupChat、SelectorGroupChat 等核心 API 与示例。https://microsoft.github.io/autogen/
