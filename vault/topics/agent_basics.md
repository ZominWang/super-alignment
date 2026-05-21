---
id: "agent_basics"
name: "Agent基础与ReAct"
name_en: "Agent Basics & ReAct"
type: "topic"
level: 3
area: "application"
direction: "agent"
prerequisites: ["basic_prompting"]
difficulty: 2
importance: 5
status: "unknown"
tags: ["agent", "react", "reasoning", "action", "loop"]
---

AI Agent 是能够感知环境、规划行动并使用工具完成复杂任务的 LLM 应用。ReAct（Reasoning + Acting）框架通过交替进行思考（Thought）和行动（Action），使 LLM 能够动态决策并与外部世界交互，是构建 Agent 的基础范式。

## Quiz

### Q1
**问题**: ReAct 框架中"Thought-Action-Observation"循环的三个步骤各自负责什么？

- A. Thought 生成代码，Action 执行代码，Observation 记录日志
- B. Thought 是 LLM 的推理过程，Action 是调用工具的指令，Observation 是工具返回的结果  ✓
- C. Thought 是用户输入，Action 是 LLM 回答，Observation 是用户反馈
- D. 三个步骤都由 LLM 独立完成，无需外部工具

**解析**: ReAct 循环：(1) Thought：LLM 分析当前状态，规划下一步；(2) Action：输出工具调用指令（如搜索、计算）；(3) Observation：将工具结果注入上下文；重复直到任务完成。这使 LLM 能够基于实时信息调整策略，解决需要多步操作的复杂任务。

### Q2
**问题**: Agent 中的"幻觉"和 RAG 中的"幻觉"有什么不同的危害？

- A. 两者危害相同，都是生成错误信息
- B. Agent 幻觉可能导致错误的工具调用（如执行危险命令、发送错误邮件），危害更大因为 Agent 会采取实际行动  ✓
- C. Agent 幻觉只发生在推理阶段，不影响行动
- D. RAG 幻觉危害更大，因为涉及知识库

**解析**: RAG 幻觉仅产生错误文本，用户可以辨别。Agent 幻觉可能导致：调用错误的函数、传入错误参数、触发不可撤销的操作（删除文件、发送消息、执行代码）。因此 Agent 系统需要额外的确认机制（人机循环 HITL）、沙箱执行和权限最小化原则。

### Q3
**问题**: 以下哪个设计使 Agent 系统更健壮，能应对工具调用失败？

- A. 增加 LLM 的 temperature 以增加创造性
- B. 在提示词中包含错误处理指令，让 Agent 在工具失败时能够重试、切换策略或向用户请求澄清  ✓
- C. 只让 Agent 使用永不失败的工具
- D. 减少工具数量以降低复杂度

**解析**: 鲁棒的 Agent 需要：(1) 在系统提示中明确错误处理策略（"若工具返回错误，请说明原因并尝试替代方案"）；(2) 设置最大重试次数防止无限循环；(3) 实现回退机制（工具A失败则尝试工具B）；(4) 清晰的任务完成/失败判断条件。
