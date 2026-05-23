---
id: "model_merging"
name: "模型合并技术"
name_en: "Model Merging Techniques"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["peft_lora", "sft"]
difficulty: 4
importance: 2
status: "unknown"
tags: ["model-merging", "ties", "dare", "task-arithmetic", "soup"]
---

模型合并（Model Merging）是一种无需 GPU 训练即可组合多个微调模型权重的技术，典型应用是将"数学专家模型"和"代码专家模型"融合为一个同时具备两类能力的模型。最基础的线性插值合并：θ_merged = (1-α)·θ_A + α·θ_B，简单但当选基模型不同或微调方向冲突时效果很差。SLERP（球面线性插值）将权重向量在高维空间中沿球面最短路径插值，保留了各向异性的权重结构，适用于合并同一基模型上微调的两个 LoRA。Task Arithmetic（模型任务算术）发现微调产生的权重变化向量 Δ=θ_finetuned-θ_base 具有"语义加性"——Δ_code + Δ_math 可以让模型同时学会代码和数学，Δ_base - Δ_toxic 可以"减去"有害内容，类比 word2vec 的 king-man+woman=queen。TIES-Merging 的三步法解决了参数冲突问题：Trim（剪掉每个任务的低幅值变化，仅保留"核心变化"）、Elect（对每个参数的多个任务符号投票，消除符号冲突）、Merge（按投票符号和量级加权合并）。DARE（Drop And REscale）在合并前随机删除大量 delta 参数（丢弃 90-99% 的微调变化）然后用放大系数补偿剩余参数，意外发现不但不降低性能反而减少冲突。进化合并通过遗传算法在参数空间中自动搜索最优合并比例，无需人工调参。实际应用已非常成熟——Hugging Face 上有大量社区用户 merge 的高分模型。

## Quiz

### Q1
**问题**: TIES-Merging 解决的核心问题是什么？

- A. 不同模型的输入 tokenization 方式不一致
- B. 合并多个任务模型时参数变化的符号冲突：例如对于同一参数，代码任务要求它增大（+0.5），数学任务要求它减小（-0.3），直接相加（+0.2）会互相抵消削弱两个能力；TIES 的三步法先剪枝再投票后合并  ✓
- C. 合并后的模型层数不一致
- D. 合并过程中模型权重溢出 FP16 范围

**解析**: 这是模型合并的核心困难——任务干扰（Task Interference）。当两个微调模型对同一参数的更新方向相反时，直接相加导致"1 + (-1) = 0"，两个能力都消失了。TIES 的 Elect 步骤将每个任务对每个参数的变化视为"对该参数改变的 +1（增大）或 -1（减小）投票"，汇总所有任务后确定该参数的最终变化符号——少数服从多数——然后仅合并与该最终符号一致的值。这相当于为合并加入了"冲突仲裁"机制。

### Q2
**问题**: DARE 的"随机丢弃 90-99% delta 参数后放大剩余参数"为什么反而能提升合并质量？

- A. 丢弃噪声参数使得模型更小推理更快
- B. 微调产生的 delta 变化中大部分是冗余的（不是每个参数的变化都对任务有贡献），DARE 的随机丢弃 + 等比例放大等价于保留核心变化而去除冗余，减少了不同任务之间冗余参数间的随机冲突  ✓
- C. 放大操作补偿了训练数据不足的问题
- D. 随机丢弃增加了模型的泛化能力

**解析**: 神经网络的过参数化意味着微调后实际对任务有效的参数变化只是少数（类似彩票假说 Lottery Ticket Hypothesis）。大部分参数的 delta 接近零或纯噪声，但在合并时这些噪声参数之间会产生大量"随机冲突"——恰好 A 任务的噪声为 +0.01，B 任务的噪声为 -0.01，相加抵消但随机影响了真实信号。DARE "丢弃→放大"相当于一个随机掩码 + 期望保持操作，让信号参数被保留（被放大补偿），噪声参数大概率被丢弃。实验结果令人震惊——丢弃 99% 的 delta 后合并，性能反而略优于全部保留。

### Q3
**问题**: 模型合并（Model Merging）与集成学习（Ensemble）在 LLM 场景下的主要区别是什么？

- A. 合并后模型仍然是单个模型，推理计算量与单模型相同；集成需要在推理时运行多个模型并聚合结果，计算量成倍增长  ✓
- B. 模型合并只适用于分类任务，集成适用于生成任务
- C. 合并是训练时技术，集成是推理时技术
- D. 模型合并需要所有模型架构完全一致，集成不需要

**解析**: 这是模型合并最大实用优势——"免费的午餐"。Weighted Ensemble 需要在推理阶段同时运行 N 个模型，对同样的输入生成 N 份输出，或混合 logits 或混合 token 预测，时间/显存成本 N 倍。Model Merging 先离线把 N 个模型合并为 1 个权重文件，之后推理就是普通的单模型推理。代价是合并过程可能引入能力损失或任务干扰，不能保证精确等价于 Ensemble 精度，但实践中 TIES + DARE 已高度逼近。

## 参考资料

### 论文
- **[Editing Models with Task Arithmetic]**(Ilharco et al., 2023) — 发现微调产生的参数变化向量具有可加减的语义性质，是模型合并理论的开端。https://arxiv.org/abs/2212.04089
- **[TIES-Merging: Resolving Interference When Merging Models]**(Yadav et al., 2023) — 提出 Trim-Elect-Merge 三步法解决多模型合并中的参数冲突。https://arxiv.org/abs/2306.01708
- **[Language Models are Super Mario: Absorbing Abilities from Homologous Models as Free Lunch]**(Yu et al., 2024) — 提出 DARE 方法，随机丢弃大部分 delta 参数后放大剩余参数，意外提升合并质量。https://arxiv.org/abs/2311.03099
