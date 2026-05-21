---
id: "multi_agent"
name: "多Agent协作"
name_en: "Multi-Agent Collaboration"
type: "topic"
level: 3
area: "application"
direction: "agent"
prerequisites: ["agent_memory"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["agent", "multi-agent", "autogen", "crew-ai", "orchestration"]
---

多 Agent 系统通过角色分工和协作解决单 Agent 难以完成的复杂任务。AutoGen、CrewAI 是主流框架，Orchestrator-Worker 模式和辩论模式（多 Agent 互相质疑提升质量）是常见架构，但协调复杂度和错误累积是核心挑战。

## Quiz

### Q1
**问题**: 多 Agent 系统中"Orchestrator-Worker"架构与"Peer-to-Peer"架构的主要区别是？

- A. Orchestrator 架构有更多 Agent
- B. Orchestrator 架构有中央协调者分配任务，P2P 架构中 Agent 平等交互，各自决定与谁通信  ✓
- C. P2P 架构总是比 Orchestrator 效率更高
- D. 两种架构使用不同的 LLM 模型

**解析**: Orchestrator-Worker：一个 Orchestrator Agent 接收任务、分解子任务、分发给专业 Worker Agent（如代码 Agent、搜索 Agent、写作 Agent）、汇总结果。适合任务分工明确的场景。P2P：Agent 直接通信，适合需要协商/辩论的任务（如多模型投票、辩论提升准确性），但协调复杂度更高。

### Q2
**问题**: "辩论"模式（Debate Pattern）在多 Agent 系统中如何提升答案质量？

- A. 多个 Agent 同时生成答案，取最长的那个
- B. 多个 Agent 提出初始答案，相互审查和质疑对方的逻辑，经过多轮辩论收敛到更准确的结论  ✓
- C. Agent 之间通过投票选择答案
- D. 辩论模式让每个 Agent 使用不同的工具

**解析**: Society of Mind 等研究表明，让多个 LLM 相互质疑可以发现单个 LLM 忽略的错误。流程：(1) 各 Agent 独立生成初始回答；(2) 每个 Agent 阅读其他 Agent 的回答并提出质疑；(3) 各 Agent 更新自己的立场；(4) 重复至收敛。在数学推理和事实核查任务上可显著减少错误率。

### Q3
**问题**: 多 Agent 系统中最难解决的"错误级联"（Error Cascade）问题是什么？

- A. 一个 Agent 崩溃导致系统无法运行
- B. 早期 Agent 的错误或假设被后续 Agent 接受并放大，最终导致严重偏差的结果  ✓
- C. 多个 Agent 同时调用同一工具产生冲突
- D. Agent 之间的通信延迟导致结果不同步

**解析**: 在长任务链中（Agent A 的输出 → Agent B 的输入 → Agent C 的输入），若 A 产生轻微错误，B 基于错误假设继续推进，C 进一步放大，最终结果可能与正确答案大相径庭。缓解策略：关键步骤设置验证 Agent（Critic）、人机循环检查点、要求每个 Agent 说明置信度和假设。
