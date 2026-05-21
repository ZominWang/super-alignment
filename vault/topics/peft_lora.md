---
id: "peft_lora"
name: "参数高效微调PEFT/LoRA"
name_en: "Parameter-Efficient Fine-Tuning (PEFT/LoRA)"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["sft"]
difficulty: 3
importance: 5
status: "unknown"
tags: ["llm", "lora", "peft", "fine-tuning", "adapter"]
---

参数高效微调（PEFT）允许在只训练少量参数的情况下对大模型进行特定任务的微调。LoRA 通过低秩分解大幅减少可训练参数，QLoRA 进一步结合量化使消费级 GPU 可以微调大模型，这是个人/小团队使用 LLM 的最实用技术。

## Quiz

### Q1
**问题**: LoRA（Low-Rank Adaptation）的核心数学原理是什么？

- A. 只训练最后几层的参数
- B. 将权重更新矩阵 ΔW 分解为两个低秩矩阵 BA 的乘积，只训练 A 和 B  ✓
- C. 对梯度进行稀疏化，只更新最大的梯度
- D. 冻结所有权重，只训练 LayerNorm 参数

**解析**: 原始权重 W ∈ R^(d×k) 保持冻结，添加旁路 ΔW = BA，其中 B ∈ R^(d×r)，A ∈ R^(r×k)，r << min(d,k)。前向传播变为 h = Wx + BAx。训练参数量从 d×k 降到 r×(d+k)，r=8时参数量通常减少99%以上。

### Q2
**问题**: QLoRA（量化 LoRA）在 LoRA 基础上引入了什么核心技术？

- A. 使用更高精度的 LoRA 矩阵
- B. 将基础模型量化为 4-bit（NF4）存储，LoRA 矩阵保持 BF16 精度，显存需求降至可用单卡微调65B模型  ✓
- C. 对 LoRA 矩阵也进行量化
- D. 使用更多的 LoRA 层

**解析**: QLoRA（Dettmers 等，2023）将冻结的基础模型权重以 4-bit NF4（Normal Float 4）格式存储，前向/反向传播时动态反量化。LoRA 矩阵仍用 BF16 进行精确梯度计算。这使得在单张 24GB GPU（如 RTX 3090/4090）上微调 65B 参数模型成为可能。

### Q3
**问题**: 在 LoRA 中，rank（秩）r 的大小如何影响微调效果？

- A. r 越大，微调后模型一定越好
- B. r 较小时参数少但可能欠拟合，r 较大时表达能力强但接近全量微调，需要根据任务复杂度选择  ✓
- C. r 的选择不影响性能，只影响内存
- D. r 应该始终设为权重矩阵维度的一半

**解析**: r=4~16 适合简单任务（如格式调整、风格迁移），r=64~256 适合复杂任务（如代码生成、多步推理）。研究表明大多数权重更新的有效秩较低，LoRA 的假设是合理的。实践中先用 r=16 作为基准，再根据需要调整。
