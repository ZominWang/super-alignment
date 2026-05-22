---
id: "grpo"
name: "GRPO与推理对齐"
name_en: "GRPO & Reasoning Alignment"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["rlhf", "chain_of_thought"]
difficulty: 5
importance: 5
status: "unknown"
tags: ["llm", "grpo", "rl", "deepseek-r1", "reasoning", "online-rl", "policy-optimization", "no-value-model"]
---

GRPO（Group Relative Policy Optimization）是 DeepSeek 提出的强化学习算法，通过对同一问题生成一组输出、以组内相对奖励替代价值模型（Value Model）来稳定训练。这使得无需独立的 Critic 网络即可进行有效的在线 RL，是 DeepSeek-R1 推理能力涌现的核心驱动力。

## Quiz

### Q1
**问题**: GRPO 相比 PPO 最核心的简化是什么？

- A. GRPO 不需要奖励模型，直接使用人工偏好数据
- B. GRPO 用同一问题多次采样结果的均值和方差来估计基线（Baseline），消除了 PPO 中独立 Critic/Value 网络的需求  ✓
- C. GRPO 采用离线学习，无需在训练中生成新样本
- D. GRPO 通过减少 KL 散度约束来实现更大的策略更新步长

**解析**: PPO 需要维护两个模型：Actor（策略模型）和 Critic（价值估计模型）。Critic 与 Actor 参数量相当，意味着显存翻倍。GRPO 的思路：对每个问题采样 G 个回答 {y₁, ..., y_G}，每个回答的 advantage = (r_i - mean(r)) / std(r)。这个组内相对奖励自然作为基线，消除了 Critic 网络的需求。对于 7B 级模型来说，这使训练显存需求减半，可行性大幅提升。

### Q2
**问题**: 在 DeepSeek-R1 的训练中，GRPO 的奖励信号来自哪里，为什么这种设计能让推理能力"涌现"？

- A. 来自人工标注的偏好数据，每条思维链都经过专家评分
- B. 来自可验证答案的自动正确性判断（数学验证器、代码执行器），无需人工标注中间推理步骤  ✓
- C. 来自更强的教师模型（如 GPT-4）对每条推理链的质量评分
- D. 来自 PRM（过程奖励模型）对每个推理步骤的逐步评分

**解析**: DeepSeek-R1 训练的关键设计：只需知道最终答案对不对（数学题用验证器检查，代码题跑单元测试），无需人工标注思维过程。当以这种纯结果信号运行 GRPO 时，模型发现"生成更长、更仔细的思维链能带来更高的正确率"，进而自发学会了反思、验证、回溯等推理策略。这证明了从稀疏奖励信号可以涌现复杂推理行为，是 2025 年 AI 领域最重要的发现之一。

### Q3
**问题**: GRPO 训练时如何处理"奖励欺骗"（Reward Hacking）问题，确保模型不仅仅是在长度上钻空子？

- A. 引入额外的长度惩罚，每超出预设长度 100 个 token 就扣除固定分数
- B. 同时使用格式奖励（思维链是否符合 <think>...</think> 格式）和正确性奖励，并用 KL 散度约束防止策略偏离过远  ✓
- C. 只使用人类偏好数据对已生成的思维链进行后处理筛选
- D. 通过对抗训练引入一个专门检测奖励欺骗的判别器

**解析**: DeepSeek-R1 使用了多维奖励：(1) 正确性奖励（答案对=+1，错=0）；(2) 格式奖励（输出是否有合法的 <think>...</think> 段）；(3) 语言一致性奖励（中文问题用中文思考，避免混语）。同时设置 KL 约束（与初始 SFT 模型的距离上限）防止模型退化。实验发现，单纯长度越长不一定得分越高——不得不正确才能得到奖励，这自然筛选出真正有效的推理策略而非凑字数。
