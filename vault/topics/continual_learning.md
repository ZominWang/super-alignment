---
id: "continual_learning"
name: "持续学习"
name_en: "Continual Learning for LLMs"
type: "topic"
level: 4
area: "llm"
direction: "llm_training"
prerequisites: ["sft", "llm_pretraining"]
difficulty: 4
importance: 3
status: "unknown"
tags: ["continual-learning", "catastrophic-forgetting", "lifelong-learning", "model-update", "knowledge-editing"]
---

持续学习（Continual Learning）研究模型如何在不断接收新数据和新知识的同时，保持对已学内容的记忆能力——核心挑战是灾难性遗忘（Catastrophic Forgetting）：新数据训练导致旧任务的性能断崖式下降。在 LLM 语境下，持续预训练（Continual Pretraining）是主要的应用场景，通过在新领域数据（如医学、法律）上继续预训练来注入领域知识，但若数据分布与原始训练数据差异过大，可能严重损害模型的通用能力。缓解策略包括经验回放（Experience Replay，混合新旧数据联合训练）、弹性权重巩固（EWC，通过对重要参数施加 L2 正则约束其远离原有值）、基于 LoRA 的持续学习（冻结基座模型、为每个新任务/领域添加独立的 LoRA 模块避免互相干扰）。知识编辑（Knowledge Editing）提供了一种更精准的持续更新方式：ROME（Rank-One Model Editing）通过定位知识存储的 MLP 层并使用秩一更新精确修改单个事实，MEMIT（Mass Editing Memory in Transformer）扩展到批量编辑大量事实。模型合并（Model Merging，如 TIES/ DARE/ SLERP）则提供了一种无需训练的"持续学习"替代——将多个专项模型合并为一个多能力模型。

## Quiz

### Q1
**问题**: 在 LLM 的持续预训练中，灾难性遗忘的主要原因是什么？

- A. GPU 显存不足导致训练中断
- B. 新数据的分布与预训练数据分布差异较大时，模型参数在梯度下降过程中过度向新数据方向偏移，覆盖了原本编码通用知识和历史任务能力的参数配置  ✓
- C. 新数据的 tokenizer 与原模型不兼容
- D. 训练时使用的 optimizer 与预训练不同

**解析**: 神经网络参数空间中，不同任务的能力可能编码在重叠的参数子空间中。当只在新数据上训练时，梯度驱动参数向最小化新任务损失的方向移动，可能破坏原有任务依赖的参数配置。特别地，在分布外新数据上训练时，参数更新幅度可能远超微调范畴，导致模型"洗脑"——通用对话能力退化、事实知识遗忘。缓解的关键是保持新老数据分布的平衡。

### Q2
**问题**: 知识编辑方法 ROME（Rank-One Model Editing）的核心思路是什么？

- A. 对模型所有层的参数进行微调
- B. 首先通过因果溯源（Causal Tracing）定位存储特定事实的 MLP 层（通常在 FFN 的早期层），然后使用秩一矩阵更新将该层的权重修改为精确编码新事实，同时最小化对其他事实的干扰  ✓
- C. 在模型输入前注入新知识的 prompt
- D. 将新知识存储到外部向量数据库中

**解析**: ROME（Meng et al., 2022）的执行步骤：(1) 因果溯源——对"埃菲尔铁塔在哪里？→ 巴黎"这类事实查询，通过噪声注入和激活修补技术定位到存储"埃菲尔铁塔位置"知识的特定层和隐藏状态；(2) 将事实编辑表述为约束优化问题——要求修改后的模型对新事实输出正确答案、同时保持无关事实不变；(3) 通过秩一矩阵更新求解该问题。ROME 可以精确编辑单个事实而不影响模型整体性能，但一次只能编辑一个事实。

### Q3
**问题**: 模型合并（Model Merging）作为持续学习替代方案的工作原理是什么？

- A. 将多个模型的预测结果投票取平均值
- B. 将一个基座模型的多组任务特定权重（如不同 LoRA 适配器或不同 SFT 的 delta 权重）通过参数层面的融合算法（如任务向量算术 TIES、DARE 随机丢弃+重缩放、球面插值 SLERP）合并为一个模型，无需重新训练即可获得多任务能力  ✓
- C. 使用知识蒸馏将多个模型压缩为一个
- D. 通过串行调用多个模型获取多任务输出

**解析**: 参数合并提供了一种"零训练成本"的多任务整合方案。关键算法：TIES（Yadav et al., 2024）三步——消除微小变化（trim）、解决符号冲突（elect sign）、不相交合并；DARE（Yu et al., 2024）随机丢弃大部分 delta 参数然后重缩放剩余参数再合并；SLERP 沿球面路径而非直线插值，保持权重范数属性。这种方法的优雅之处在于：每个任务独立微调、无需担心遗忘，最后通过数学运算融合——虽然效果可能略逊于联合训练，但以极低成本获得了不错的通用能力。

## 参考资料

### 论文
- **[Overcoming Catastrophic Forgetting in Neural Networks]** (Kirkpatrick et al., 2017) — 提出弹性权重巩固（EWC）算法，通过 Fisher 信息矩阵对关键参数施加正则约束，是持续学习领域的奠基性工作。https://arxiv.org/abs/1612.00796
- **[Locating and Editing Factual Associations in GPT]** (Meng et al., 2022) — 提出 ROME 方法，通过因果溯源定位 Transformer 中存储事实的 MLP 层并进行精确秩一编辑，开创了知识编辑研究方向。https://arxiv.org/abs/2202.05262
- **[A Continual Learning Survey: Defying Forgetting in Classification Tasks]** (De Lange et al., 2022) — 系统综述持续学习领域的主流方法，涵盖正则化、回放、参数隔离三大策略家族及其适用场景对比。https://arxiv.org/abs/1909.08383
