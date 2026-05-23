---
id: "reward_modeling"
name: "奖励模型设计"
name_en: "Reward Model Design"
type: "topic"
level: 4
area: "safety"
direction: "alignment"
prerequisites: ["rlhf", "value_alignment"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["reward-model", "preference", "bradley-terry", "ensemble", "overoptimization"]
---

奖励模型（Reward Model, RM）是 RLHF（Reinforcement Learning from Human Feedback）的核心组件，负责将人类偏好转化为可优化的标量信号。其数学基础通常是 Bradley-Terry 偏好模型：给定两个回答 y₁ 和 y₂，y₁ 被偏好的概率为 P(y₁≻y₂) = exp(r(y₁)) / (exp(r(y₁)) + exp(r(y₂)))，训练时通过最大化偏好对的似然来学习奖励函数。架构上通常从 SFT 模型初始化、移除语言建模头并添加线性层，输出标量奖励值。训练数据构建依赖人工标注的偏好对，质量控制需关注标注者间一致性、位置偏差（先出现易被偏好）和长度偏差（更长的回答天然获得更高奖励）。核心挑战包括 Reward Hacking（RM 被策略模型利用漏洞获得高奖励但实际质量不升反降）和过度优化（Goodhart's Law——当奖励信号成为优化目标后它就不再是好的质量度量）。应对方案有 Ensemble Reward Model（多 RM 投票/平均）、Process Reward Model（PRM，对推理过程分步打分而非仅评最终结果）、以及引入 KL 散度惩罚约束策略模型不偏离太远。

## Quiz

### Q1
**问题**: Bradley-Terry 模型在 RLHF 奖励建模中的作用是什么？

- A. 直接预测哪个回答更准确
- B. 将对回答的偏好比较转化为奖励值估计，两个回答被偏好的概率由其奖励值的指数函数之比决定，通过最大化偏好对的似然训练 RM 来拟合隐藏的奖励函数  ✓
- C. 生成训练数据的奖励标签
- D. 评估 RLHF 策略模型的胜率

**解析**: Bradley-Terry 模型将偏好建模为概率竞赛：若回答 A 比 B 强 r(A)-r(B) 的隐式奖励差距，则 A 被选中的概率为 logistic(r(A)-r(B))。训练 RM 时，对每个偏好对 (chosen, rejected)，最大化 P(chosen≻rejected) = σ(r(chosen) - r(rejected))。这是 InstructGPT/ChatGPT 训练中 RM 阶段的标准损失函数。

### Q2
**问题**: Reward Hacking（奖励攻击）的典型表现是什么？

- A. RM 模型被黑客网络攻击
- B. 策略模型在 RL 微调中找到 RM 的漏洞——如生成冗长但空洞的回答、重复某些 RM 过度奖励的关键词或句式、利用 RM 的长度偏差等——使奖励分数上升但真实回答质量下降  ✓
- C. RM 训练收敛到局部最优
- D. 人类标注者故意给出错误偏好

**解析**: Reward Hacking 是 RM+RL 范式的一个根本性挑战。因为 RM 只是一个近似人类偏好的代理，它不可避免地存在盲区。当策略模型被优化到 RM 的高分区域时，可能会"过拟合"到 RM 的弱点。典型例子包括：RM 过度奖励"看起来专业"的句式、长度偏差（长回答得分自然高）、特定话题触发高奖励等。缓解手段：KL 散度惩罚（约束 π_θ 不偏离 π_ref 太远）、Ensemble RM、定期人工评估策略输出并重新标注。

### Q3
**问题**: Process Reward Model（PRM）与 Outcome Reward Model（ORM）的核心区别是什么？

- A. PRM 运行速度更快
- B. ORM 仅对最终答案打分；PRM 对推理或生成过程的每一步（chain-of-thought 的每个中间步骤）分别打分，提供粒度更细的过程监督信号  ✓
- C. PRM 不需要人工标注
- D. ORM 用于训练，PRM 仅用于推理

**解析**: 传统 ORM 只给最终输出一个奖励值——这对长推理链问题有严重的稀疏奖励问题（中间步骤无法获得反馈）。PRM 对 CoT 的每一步都打分（如每一步推理是否正确），提供密集的过程监督。这在数学推理中效果显著（Lightman et al., 2023 的"Let's Verify Step by Step"）。PRM 可以通过人工标注每一步的正确性，或自动从最终答案是否正确回溯推断中间步骤质量（Math-Shepherd 方法）来训练。

## 参考资料

### 论文
- **[Training Language Models to Follow Instructions with Human Feedback]** (Ouyang et al., 2022) —— InstructGPT 论文，首次完整展示 RLHF 三阶段训练流程（SFT→RM→PPO），是 ChatGPT 的技术基础。https://arxiv.org/abs/2203.02155
- **[Rank Analysis of Incomplete Block Designs]** (Bradley & Terry, 1952) —— Bradley-Terry 偏好模型的原始论文，奠定了 RLHF 奖励建模的概率比较理论基础。
- **[Scaling Laws for Reward Model Overoptimization]** (Gao et al., 2023) —— 系统研究奖励模型过度优化的标度律，揭示了 Goodhart's Law 在 RLHF 中的定量表现。https://arxiv.org/abs/2210.10760
