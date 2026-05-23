---
id: "agent_design_patterns"
name: "Agent设计模式"
name_en: "Agent Design Patterns"
type: "topic"
level: 3
area: "application"
direction: "agent"
prerequisites: ["agent_basics", "tool_use"]
difficulty: 3
importance: 4
status: "unknown"
tags: ["agent", "design-patterns", "reflection", "planning", "orchestration"]
---

Andrew Ng 提出的 Agentic Design Patterns 概括了构建智能 Agent 的四大核心模式，为 Agent 系统设计提供了通用蓝图。Reflection（反思）模式让 Agent 在生成初步输出后对自身结果进行批判性审查并迭代改进，典型实现包括 Self-Refine 和 Reflexion。Tool Use（工具调用）模式赋予 LLM 调用外部函数、API 和数据库的能力，使其突破纯文本生成的局限。Planning（规划）模式将复杂任务分解为有序子任务并逐步执行，代表方法有 Plan-and-Solve 和 Tree of Thoughts。Multi-agent Collaboration（多 Agent 协作）通过角色分工（如 Coder + Reviewer、Orchestrator + Worker）实现复杂任务的分担与交叉验证。在这些基础模式之上还衍生出 Router（根据任务类型路由到不同 LLM/工具）、Orchestrator-Worker（主控制器派发子任务给工作节点）等子模式，构成了现代 Agent 框架（LangGraph、CrewAI、AutoGen）的设计哲学基础。

## Quiz

### Q1
**问题**: Reflection 模式与简单的"多轮对话"有什么本质区别？

- A. 没有本质区别，都是多次调用 LLM
- B. Reflection 让 LLM 在每次迭代中明确生成自我批评和改进建议，并将这些批评作为下一轮生成的上下文，形成"生成→自我批评→改进→再批评"的闭环优化；而多轮对话只是简单追加对话历史  ✓
- C. Reflection 必须使用多个 LLM，多轮对话只需要一个
- D. Reflection 模式只能用于代码生成场景

**解析**: 以 Reflexion（Shinn et al., 2023）为例：Agent 执行任务后，不仅收到执行结果，还基于启发式评估生成"反思文本"（reflection text），存储在 Episodic Memory 中。后续遇到类似任务时优先读取反思记录，从而避免重复犯同样的错误。这个"元认知"机制是多轮对话不具备的——多轮对话不会显式提炼和改进自己的策略。

### Q2
**问题**: Planning 模式在处理复杂任务时最常遇到什么挑战？

- A. LLM 无法生成分步计划
- B. 计划本身可能是次优的，且执行过程中可能遇到意外的子任务失败或环境变化导致后续步骤不可行，需要动态重规划（Replanning）  ✓
- C. 步骤越多回答速度越快
- D. 规划模式只适用于数学问题

**解析**: Planning 的核心挑战：(1) 初始计划的质量依赖 LLM 的任务理解能力；(2) 执行中某步失败可能导致后续步骤的前提条件丢失；(3) 外部环境变化（如 API 变更、数据更新）使原计划失效。应对方案包括在每个步骤后重新评估计划（replanning）、保留多个备选计划、使用树搜索（如 ToT）探索不同路径。实际工程中，Plan-and-Execute（先生成完整计划再逐一执行）比逐步反应式规划在复杂任务上效果更好，但对异常也更敏感。

### Q3
**问题**: Orchestrator-Worker 模式中，Orchestrator（编排器）的职责是什么？

- A. 直接执行所有底层操作
- B. 接收总体任务，分解为子任务，将子任务分派给特定的 Worker 执行，收集和综合 Worker 的返回结果，根据中间结果动态调整后续分派  ✓
- C. 只负责控制 Worker 的启动和关闭
- D. 负责训练 Worker 使用的 LLM

**解析**: 在 Orchestrator-Worker 架构中，Orchestrator 是"大脑"——类似产品经理角色。它分析用户请求的整体目标，将其拆分为可独立执行的工作单元，选择最合适的 Worker（可能是不同专长的 Agent/工具），监控执行进度，在必要时重新分派或合并结果。Worker 是执行者，专注于完成特定子任务（如代码编写、数据查询、文档分析）。这种模式在 AutoGen 和 CrewAI 中被广泛使用，实现了关注点分离和专业化分工。

## 参考资料

### 论文
- **[ReAct: Synergizing Reasoning and Acting in Language Models]** (Yao et al., 2023) — 提出推理与行动交替进行的 Agent 范式，将思维链推理与工具调用融合为统一循环。https://arxiv.org/abs/2210.03629
- **[Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning]** (Wang et al., 2023) — 提出先规划再求解的提示策略，将复杂推理分解为计划生成与逐步执行两个阶段。https://arxiv.org/abs/2305.04091

### 视频（B站/YouTube）
- **[Agentic Design Patterns]** — Andrew Ng / DeepLearning.AI The Batch (2024). 提出 Agent 四大核心设计模式：Reflection、Tool Use、Planning、Multi-agent Collaboration。https://www.deeplearning.ai/the-batch/agentic-design-patterns-part-1-reflection/

### 课程
- **[AI Agentic Design Patterns with AutoGen]** — Microsoft / DeepLearning.AI（免费）。通过 AutoGen 框架实战实现四大 Agent 设计模式，含多 Agent 对话编排、工具集成与代码执行沙箱，直接将理论转化为可运行系统。https://www.deeplearning.ai/short-courses/ai-agentic-design-patterns-with-autogen/
- **[Multi AI Agent Systems with crewAI]** — João Moura / DeepLearning.AI（免费）。通过 crewAI 实战多 Agent 协作系统，含角色分工、顺序/并行流程编排与工具集成，是多 Agent 设计模式的工程实践标杆课程。https://www.deeplearning.ai/short-courses/multi-ai-agent-systems-with-crewai/
- **[Anthropic Building Effective Agents Course]** — Anthropic 官方课程（免费）。五种 Agent 工作流模式（Prompt Chaining/Routing/Parallelization/Orchestrator/Evaluator-Optimizer）的逐一拆解与实现，与 Andrew Ng 的四模式分类互为补充，是设计模式落地的最权威参考。https://github.com/anthropics/courses/tree/master/building_effective_agents
