---
id: "reasoning_models"
name: "推理模型与思维链训练"
name_en: "Reasoning Models & Chain-of-Thought Training"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["chain_of_thought", "rlhf"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["llm", "reasoning", "o1", "deepseek-r1", "cot-training", "prm", "orm", "slow-thinking", "rl"]
---

推理模型（o1/o3/DeepSeek-R1）代表了 LLM 的新范式：通过强化学习训练模型生成显式内部思维链（"慢思考"），而非直接输出答案。PRM（过程奖励模型）在每个推理步骤给予信号，ORM（结果奖励模型）仅对最终答案打分，二者的取舍决定了推理质量与训练效率的平衡。

## Quiz

### Q1
**问题**: 推理模型（如 o1）和普通 LLM 在推理时的核心区别是什么？

- A. 推理模型使用更大的参数量和更多的训练数据
- B. 推理模型在输出答案前会生成扩展的内部思维链（Chain-of-Thought），通过"计算换质量"提升复杂任务表现  ✓
- C. 推理模型使用 MoE 架构替代了标准 Transformer
- D. 推理模型依赖检索增强（RAG）来获取推理所需信息

**解析**: o1 的核心创新是"Test-Time Compute Scaling"——在推理阶段花费更多计算（生成更长的思维链），而非只在训练阶段扩大规模。实验表明，对于数学/代码/逻辑等需要多步推理的任务，让模型"思考更长时间"比单纯增大参数量更有效。DeepSeek-R1 通过 GRPO 强化学习让模型自发学会了这种行为。

### Q2
**问题**: PRM（Process Reward Model，过程奖励模型）和 ORM（Outcome Reward Model，结果奖励模型）的主要区别是？

- A. PRM 用于训练，ORM 用于推理时搜索
- B. PRM 对推理链中每个中间步骤给予奖励信号，ORM 只对最终答案的正确性打分  ✓
- C. PRM 需要人工标注，ORM 可以完全自动化
- D. PRM 用于数学任务，ORM 用于代码任务

**解析**: ORM 实现简单（只需知道答案对错），但信号稀疏，中间错误步骤得不到反馈。PRM 信号密集，能精确指出推理链在哪步出错，理论上更优，但需要高质量的逐步标注数据（成本高）。OpenAI 的 "Let's Verify Step by Step"论文系统比较了两者：PRM 在数学推理上显著优于 ORM，但数据收集困难是主要瓶颈。

### Q3
**问题**: DeepSeek-R1 能够在没有人工标注思维链的情况下，通过强化学习"自发"学会推理的关键原因是什么？

- A. DeepSeek-R1 使用了更强的基础模型（DeepSeek-V3）做初始化
- B. 使用 GRPO 算法，以数学/代码题的最终答案正确性作为奖励，模型自发涌现出检验、反思、回溯等推理行为  ✓
- C. 通过大规模蒸馏 OpenAI o1 的输出数据进行监督学习
- D. 引入了专门的"推理专家"模块，与其他 FFN 专家并行工作

**解析**: DeepSeek-R1 的关键发现：当使用 GRPO（一种无需价值模型的在线 RL 算法）以正确性为奖励训练时，模型会"自我发现"有效的推理策略——包括在中间插入验证步骤、发现错误后回溯、尝试多种解法。这种涌现行为无需人工设计推理格式，表明推理能力可以从纯结果信号中自发出现。这一发现改变了业界对推理模型训练方式的认知。

## 参考资料

### 论文
- **[Chain-of-Thought Prompting Elicits Reasoning in Large Language Models]** (Jason Wei et al., 2022) — 系统证明思维链提示能显著提升 LLM 在数学、推理等复杂任务上的表现，是推理模型研究的重要基础。https://arxiv.org/abs/2201.11903
- **[DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning]** (DeepSeek-AI, 2025) — 提出通过 GRPO 强化学习让模型自发学习推理策略，无需人工标注思维链，在数学和代码任务上达到 o1 级别性能。https://arxiv.org/abs/2501.12948
- **[Let's Verify Step by Step]** (Hunter Lightman et al., 2023) — OpenAI 的过程奖励模型（PRM）研究，系统比较了 PRM 与 ORM 在数学推理上的效果，证明过程监督显著优于结果监督。https://arxiv.org/abs/2305.20050
