---
id: "rlhf"
name: "RLHF与偏好对齐"
name_en: "RLHF & Preference Alignment"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["sft"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["llm", "rlhf", "alignment", "ppo", "reward-model", "dpo"]
---

RLHF（基于人类反馈的强化学习）是使 LLM 遵循人类价值观的核心技术。通过训练奖励模型学习人类偏好，再用 PPO 优化语言模型以最大化奖励，InstructGPT/ChatGPT 的成功证明了这条路线的有效性。DPO 作为更简洁的替代方案正在被广泛采用。

## Quiz

### Q1
**问题**: RLHF 三步流程中，奖励模型（Reward Model）的训练数据是什么形式？

- A. 人工标注每个回答的绝对分数（1-10分）
- B. 对同一问题的两个模型回答进行偏好排序（哪个更好），训练偏好分类器  ✓
- C. 收集人工写作的理想回答
- D. 标注回答中的有害内容位置

**解析**: 绝对评分受标注者主观差异影响大（"7分"的含义因人而异）。偏好比较（"A比B好"）更一致可靠。Bradley-Terry 模型将比较数据转化为分数，奖励模型训练为：对人类偏好的回答给出更高分数。最终奖励模型替代人类，实时为 PPO 提供信号。

### Q2
**问题**: PPO（近端策略优化）在 RLHF 中使用 KL 散度约束的目的是什么？

- A. 加速训练收敛
- B. 防止语言模型偏离原始 SFT 模型过远，避免"奖励欺骗"（模型找到高分但荒谬的输出）  ✓
- C. 平衡不同回答的长度
- D. 确保奖励模型的预测准确

**解析**: 若无约束，LLM 可能找到奖励模型的漏洞（奖励欺骗/Reward Hacking），生成奖励高但实际质量差的回答。PPO 的目标函数为：E[r(x,y)] - β·KL(π_θ||π_SFT)，KL 项约束新策略不要偏离 SFT 模型太远，β 控制约束强度。

### Q3
**问题**: DPO（Direct Preference Optimization）相比 RLHF+PPO 的主要简化是？

- A. DPO 不需要人类偏好数据
- B. DPO 跳过了奖励模型训练阶段，直接从偏好对数据更新语言模型参数  ✓
- C. DPO 不需要参考模型
- D. DPO 的训练速度提升了10倍

**解析**: RLHF 需要训练奖励模型、再运行 PPO 强化学习，流程复杂，内存消耗大（需同时维护策略模型和参考模型）。DPO 将 RLHF 的目标重新参数化为分类损失，直接用（提示，好回答，坏回答）三元组训练 LLM，理论等价但实现简单得多，是目前学术界最主流的对齐方法。
