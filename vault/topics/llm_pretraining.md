---
id: "llm_pretraining"
name: "大规模预训练"
name_en: "Large-Scale Pretraining"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["pretrained_lm"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["llm", "pretraining", "distributed-training", "data-pipeline"]
---

大规模预训练需要数千 GPU 协同工作数月，涉及数据管道（去重、过滤、质量筛选）、分布式训练策略（数据并行、模型并行、流水线并行）、混合精度训练和检查点管理。理解这些工程挑战是理解 LLM 能力边界的关键。

## Quiz

### Q1
**问题**: 在分布式训练中，"数据并行"（Data Parallelism）和"模型并行"（Model Parallelism）的主要区别是？

- A. 数据并行更快，模型并行更准确
- B. 数据并行将数据分片让多个完整模型副本并行处理，模型并行将模型本身分割到多个设备  ✓
- C. 模型并行用于 CPU，数据并行用于 GPU
- D. 数据并行需要更多内存

**解析**: 数据并行（DDP）每个 GPU 持有完整模型，处理不同数据分片，梯度同步后更新。模型并行将模型层分配到不同 GPU，适合单 GPU 放不下的超大模型。Megatron-LM 等框架同时使用张量并行+流水线并行+数据并行的3D并行策略。

### Q2
**问题**: 大规模预训练数据集的"去重"（Deduplication）步骤最重要的原因是？

- A. 减少存储空间
- B. 防止模型在重复数据上过拟合，记住特定文本而非学习真正的语言规律  ✓
- C. 加速数据加载
- D. 减少词表大小

**解析**: 网络爬取的数据存在大量重复（完全相同或近似重复的网页）。若模型多次见到相同文本，会倾向于记忆而非泛化，可能直接背诵训练数据（隐私风险）而非理解语言。MinHash LSH 是常用的近似去重算法。

### Q3
**问题**: 混合精度训练（Mixed Precision Training）使用 FP16/BF16 相比 FP32 的核心权衡是？

- A. 精度完全相同，仅节省内存
- B. FP16/BF16 减少内存和计算量约 50%，但需要损失缩放（Loss Scaling）防止数值下溢  ✓
- C. 混合精度训练仅适用于推理阶段
- D. BF16 比 FP16 精度更高但速度更慢

**解析**: FP16 的数值范围小，小梯度可能下溢为零。Loss Scaling 在前向传播后将损失乘以大数（如 2^15），梯度同比放大，反向传播后再缩小回来。BF16（Brain Float 16）保持与 FP32 相同的指数位，不需要 Loss Scaling，在 A100 等新硬件上更常用。

## 参考资料

### 论文
- **[Language Models are Few-Shot Learners]** (Brown et al., 2020) —— GPT-3 论文，展示 175B 参数模型通过上下文学习即可解决多种任务。https://arxiv.org/abs/2005.14165
- **[LLaMA: Open and Efficient Foundation Language Models]** (Touvron et al., 2023) —— Meta 开源大模型系列，证明仅用公开数据可训练出媲美闭源模型的性能。https://arxiv.org/abs/2302.13971
- **[The Llama 3 Herd of Models]** (Dubey et al., 2024) —— Llama 3 系列论文，涵盖 8B 到 405B 参数的训练细节与评测结果。https://arxiv.org/abs/2407.21783
