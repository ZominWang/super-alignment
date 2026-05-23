---
id: "agent_planning"
name: "Agent任务规划"
name_en: "Agent Task Planning"
type: "topic"
level: 3
area: "application"
direction: "agent"
prerequisites: ["agent_basics", "chain_of_thought", "agent_design_patterns"]
difficulty: 3
importance: 4
status: "unknown"
tags: ["planning", "task-decomposition", "tree-of-thought", "graph-of-thought", "pddl", "hierarchical"]
---

Agent任务规划的核心挑战是将高层抽象目标分解为可执行的原子动作序列。Plan-and-Solve范式通过先生成完整计划再逐步执行，减少中间步骤的规划偏差。Tree-of-Thoughts（ToT）在每个推理步骤生成多个候选分支，通过BFS/DFS搜索加评估函数剪枝，像决策树遍历一样探索推理空间。Graph-of-Thoughts（GoT）进一步将推理组织为有向无环图(DAG)，允许分支聚合和并行探索，避免重复计算。层次化规划(Hierarchical Planning)模仿人类思维：高层战略目标→中层子任务→底层工具调用，每层可独立调整。ReWOO(Reasoning WithOut Observation)将规划与执行解耦，LLM一次性生成完整规划蓝图（含预期工具调用），执行器按图索骥，避免中间Observation干扰推理连贯性。PDDL等经典规划语言与LLM的结合提供了形式化保证。自我修正机制使Agent在执行失败时能回溯分析、调整策略。

## Quiz

### Q1
**问题**: Tree-of-Thoughts与标准Chain-of-Thought在推理机制上的本质区别是什么？

- A. ToT每一步生成多个候选推理步骤并构建搜索树，通过评估函数剪枝选择最优路径；CoT逐步骤线性生成  ✓
- B. ToT使用更大的模型
- C. ToT不需要prompt
- D. ToT只在数学推理中有效

**解析**: CoT沿单一推理链前进，一旦某步出错可能导致整个推理链偏离。ToT在每一步生成k个候选"思维"（如用temperature采样多次），对每个状态用评估函数打分（可以是LLM评估或规则），然后决定BFS（广撒网，选择最优的几个继续探索）或DFS（深入单一分支直到结果或死胡同）。ToT的关键创新是将推理建模为启发式搜索问题，本质上是决策树遍历在LLM推理空间的应用。代价是推理成本约k倍于CoT。

### Q2
**问题**: ReWOO中"Without Observation"的含义及设计动机是什么？

- A. Agent不观察任何外部反馈
- B. LLM在规划阶段生成完整执行蓝图（含所有预期工具调用），执行器离线执行；避免工具返回的中间结果打断LLM的推理链连贯性  ✓
- C. 只适用于不需要工具的简单任务
- D. 观察步骤由单独的模型完成

**解析**: ReWOO将Agent工作流分为Plan+Execute两个独立阶段。Plan阶段：LLM一次性输出所有步骤的参数化计划，如"Step1: search(keyword)→#E1; Step2: use(#E1, summary)→#E2"。Execute阶段：调度器按依赖关系执行工具，工具输出填回占位符。核心动机：(1) 减少LLM调用次数（按步骤数而非步骤数+观察轮次）；(2) 避免工具返回的长文本干扰LLM上下文窗口和推理链；(3) 可并行执行无依赖的步骤。代价是缺乏动态适应能力——执行期间无法根据中间结果调整计划。

### Q3
**问题**: 在LLM Agent的层次化规划中，"原子动作"层级的粒度应当如何确定？

- A. 每个API调用作为一个原子动作
- B. 原子动作应当是对LLM有足够语义信息的最小可执行单元——太小则冗余、太大则不够灵活，通常在"一次工具调用完成一个明确语义功能"的粒度  ✓
- C. 所有动作粒度必须统一
- D. 原子动作由用户的输入长度决定

**解析**: 层次化规划的设计要点：(1) 高层："为报告收集Q3销售数据"——概括性目标；(2) 中层："检索7-9月销售数据→计算环比增长→生成图表"——子任务；(3) 底层：具体函数调用（`query_db(sql="...")`）——原子动作。粒度原则：若原子动作太小（如"获取表名、获取列名、拼接SQL"拆成3步），会增加规划开销和LLM调用次数；若太大将多个语义操作打包，则丧失灵活性。理想粒度是每个原子动作有独立可验证的语义效果，Agent可以据此判断成功/失败并采取不同回退策略。

## 参考资料

### 论文
- **[Tree of Thoughts: Deliberate Problem Solving with Large Language Models]** (Yao et al., 2023) — 将推理建模为搜索树，每一步生成多个候选"思维"并通过评估函数剪枝，显著提升复杂推理任务表现。https://arxiv.org/abs/2305.10601
- **[Graph of Thoughts: Solving Elaborate Problems with Large Language Models]** (Besta et al., 2024) — 将推理组织为有向无环图(DAG)，支持分支聚合和并行探索，避免重复计算。https://arxiv.org/abs/2308.09687

### 课程
- **[AI Agents in LangGraph]** — Tavily & Harrison Chase / DeepLearning.AI（免费）。含 Agent 规划专章，通过 LangGraph 状态机实现 Plan-Execute 和 ReWOO 等规划范式，直接将 ToT/GoT 理论落地为可运行代码。https://www.deeplearning.ai/short-courses/ai-agents-in-langgraph/
- **[Building Effective Agents]** — Anthropic 官方博客（2024）。从工程视角阐释 Agent 规划的核心原则：何时用固定 workflow 替代动态规划、如何通过 Orchestrator-Subagent 分解复杂任务，是规划系统设计的必读参考。https://www.anthropic.com/research/building-effective-agents

