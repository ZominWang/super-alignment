---
id: "scaling_laws"
name: "规模法则Scaling Laws"
name_en: "Scaling Laws"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["llm_pretraining"]
difficulty: 4
importance: 3
status: "unknown"
tags: ["llm", "scaling-laws", "chinchilla", "compute", "emergent"]
---

规模法则描述了模型性能与计算量、参数量、数据量之间的幂律关系。Kaplan 等（GPT-3论文）和 Hoffmann 等（Chinchilla）的研究揭示了最优资源分配策略，也预测了涌现能力（Emergent Abilities）在特定规模阈值后突然出现的现象。

## Quiz

### Q1
**问题**: Chinchilla 规模法则的核心发现是什么，与 Kaplan 等早期工作的主要分歧是？

- A. Chinchilla 发现模型越大越好，Kaplan 认为数据量更重要
- B. Chinchilla 证明在固定计算预算下，参数量和训练 token 数应大致相等（约每参数20个token），早期工作低估了数据的重要性  ✓
- C. Chinchilla 只研究推理成本，Kaplan 研究训练成本
- D. Chinchilla 否定了规模法则的适用性

**解析**: Kaplan 等认为模型越大越好（即使训练不充分）。Hoffmann 等训练 70B 的 Chinchilla 模型，使用更多数据，性能超过更大的 Gopher（280B）。结论：给定计算预算 C，最优参数量 N ∝ √C，最优 token 数 D ∝ √C，即 N≈D（约20 tokens/parameter）。

### Q2
**问题**: LLM 的"涌现能力"（Emergent Abilities）指什么现象？

- A. 模型规模增大时，所有能力线性提升
- B. 某些能力在小模型上几乎不存在（随机水平），但超过某个参数量阈值后突然出现  ✓
- C. 模型在训练集上的涌现能力指过拟合
- D. 涌现能力指模型在测试时推理速度突然加快

**解析**: 算术推理、多步逻辑等任务在小模型（<10B）上性能接近随机，但在足够大的模型上突然大幅提升。这种"相变"行为难以从小规模实验预测。Wei 等（2022）系统记录了这一现象，引发了对规模法则局限性的讨论。

### Q3
**问题**: 在固定推理预算下（相同 FLOPs/dollar），选择更大但训练不足的模型还是更小但训练充分的模型？

- A. 更大的模型即使训练不足也更好
- B. 推理时更小的充分训练模型（如 Chinchilla 最优）更经济，因为推理成本与参数量线性相关  ✓
- C. 两者推理性能相同
- D. 取决于具体硬件

**解析**: 训练成本支付一次，推理成本持续积累。对于高流量的线上服务，推理成本可能在数月内超过训练成本。更小的充分训练模型（遵循 Chinchilla 法则）在相同性能下参数量更少，推理更快更便宜。Llama 系列的设计哲学正是面向推理效率优化。

## 参考资料

### 论文
- **[Scaling Laws for Neural Language Models]**(Kaplan et al., 2020) — GPT-3 相关研究，首次系统分析模型性能与计算量、参数量的幂律关系。https://arxiv.org/abs/2001.08361
- **[Training Compute-Optimal Large Language Models]**(Hoffmann et al., 2022) — Chinchilla 论文，提出最优计算分配下参数量与训练 token 数应等比例增长的法则。https://arxiv.org/abs/2203.15556
- **[Scaling Data-Constrained Language Models]**(Muennighoff et al., 2023) — 当数据量受限时（数据耗尽场景），分析多轮重复训练数据的缩放行为。https://arxiv.org/abs/2305.16264
