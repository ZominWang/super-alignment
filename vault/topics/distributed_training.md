---
id: "distributed_training"
name: "分布式训练"
name_en: "Distributed Training"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["llm_pretraining", "backpropagation", "gpu_cuda_basics"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["distributed-training", "data-parallel", "model-parallel", "pipeline-parallel", "zero", "fsdp", "megatron"]
---

大模型分布式训练是使千亿甚至万亿参数模型能在成百上千张 GPU 上高效训练的系统工程，核心挑战在于突破单卡显存和算力限制。技术栈通常为四层并行混合：数据并行（DP/DDP）每卡持有完整模型副本、计算不同 batch 的梯度后用 AllReduce 同步——简单但受限于单卡可容纳模型大小；模型并行又分为张量并行（Tensor Parallelism, TP）将单个 Transformer 层内的参数矩阵切分到多卡，层内通信密集但计算加速直接，和流水线并行（Pipeline Parallelism, PP）将不同层分到不同设备、micro-batch 流水式前向/反向——层间通信量小但存在"流水线气泡"（bubble）导致 GPU 空闲。3D 并行（TP+PP+DP）是目前训练 GPT 规模模型的标配。ZeRO（Zero Redundancy Optimizer）另辟蹊径，通过将优化器状态（ZeRO-1）、梯度（ZeRO-2）、参数（ZeRO-3）分片到所有设备上，在数据并行的通信效率下实现了模型并行的显存节约——ZeRO-3 可训练万亿参数模型。混合精度训练（FP16/BF16）：前向反向用半精度加速，关键路径维护 FP32 主权重防止舍入累积误差，加上 loss scaling 防止小梯度下溢出。通信优化技巧如梯度累积（多 micro-batch 后一次同步）、异步通信/计算重叠（backward 与 AllReduce 并行）同样关键。关键论文：Rajbhandari et al. 2020 "ZeRO", Narayanan et al. 2021 "Megatron-LM", Zhao et al. 2023 "PyTorch FSDP"。

## Quiz

### Q1
**问题**: 流水线并行（Pipeline Parallelism）中"气泡"（Bubble）问题指什么？

- A. 模型权重加载时需要从磁盘读取，造成 I/O 阻塞
- B. 每个 micro-batch 的 warm-up 和 cool-down 阶段部分 GPU 空闲等待，降低整体利用率 ✓
- C. 梯度累积到一定程度后溢出显存
- D. 不同 micro-batch 之间的梯度方向不一致

**解析**: 流水线并行将模型按层横切到多个 GPU，典型的 GPipe 调度：前向传播时 GPU0 处理完 micro-batch 1 传给 GPU1，然后继续处理 micro-batch 2；反向反向进行。在起始阶段 GPU1..N 等 GPU0 输出（前向 bubble），在结束阶段 GPU0..N-1 等最后几层的梯度（反向 bubble）。bubble 大小约为 (P-1)/(M)（P=设备数, M=micro-batch 数）。1F1B 调度（一个前向接一个反向交替）可减少激活值缓存的峰值但 bubble 类似。增大 micro-batch 数量可缩小 bubble 比例，但受显存限制。

### Q2
**问题**: ZeRO 优化的三个 Stage（ZeRO-1/2/3）分别切分什么？

- A. ZeRO-1 切分优化器状态，ZeRO-2 再切分梯度，ZeRO-3 再切分模型参数 ✓
- B. 都是切分模型参数，只是算法不同
- C. ZeRO-1 切分数据，ZeRO-2 切分模型，ZeRO-3 切分优化器
- D. 三个阶段对应训练的不同 epoch

**解析**: ZeRO 核心洞察：数据并行中每张卡存储相同的优化器状态（Adam 的 momentum、variance + FP32 参数，共约 12× 模型大小）、梯度（2×）、参数（2×），总计约 16 倍参数量的冗余。ZeRO-1 将优化器状态分片到各卡，每卡只持有 1/N 份，通信量 = 梯度 AllReduce（不变）。ZeRO-2 额外分片梯度，每卡只持有更新自己参数所需的梯度片段。ZeRO-3 再分片模型参数，每卡按需通过 AllGather 获取所需参数，通信量增加 1.5 倍但显存降至 1/N。

### Q3
**问题**: 为什么大模型训练中倾向于使用 BF16 而非 FP16？

- A. BF16 的训练速度比 FP16 快一倍
- B. BF16 的动态范围与 FP32 相同（8 位指数位），不会因梯度值过大而溢出；FP16 的指数位只有 5 位，需要 loss scaling 技巧来防止小梯度下溢，同时又有上溢风险 ✓
- C. BF16 的计算精度更高
- D. BF16 不需要转换 FP32 主权重

**解析**: FP16（IEEE 754 half）：1 符号 + 5 指数 + 10 尾数，范围约 [6e-8, 65504]。BF16（Google Brain Float 16）：1 符号 + 8 指数 + 7 尾数，范围约 [1.2e-38, 3.4e38] 与 FP32 相同。训练中梯度可能非常小（<< 6e-8），FP16 直接变为 0（下溢），需要 loss scaling 技巧人工放大；同时 FP16 最大 65504，大值也会上溢。BF16 指数位多，动态范围与 FP32 一致，几乎不需要 loss scaling，大幅简化训练流程。代价是无法在 FP16 硬件（如 V100）上原生支持，需 Ampere 及更新架构（A100/H100）。

## 参考资料

### 论文
- **[ZeRO: Memory Optimizations Toward Training Trillion Parameter Models]** (Rajbhandari, Rasley, Ruwase, He, 2020) — 提出 ZeRO-DP 三级优化器/梯度/参数分片，在数据并行框架下实现万亿参数训练。https://arxiv.org/abs/1910.02054
- **[Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM]** (Narayanan, Shoeybi, Casper, 2021) — Megatron-LM 的 TP/PP/DP 3D 并行体系，SC'21 最佳论文提名。https://dl.acm.org/doi/10.1145/3458817.3476209
- **[PyTorch FSDP: Experiences on Scaling Fully Sharded Data Parallel]** (Zhao, Gu, Varma, 2023) — Facebook 分享 FSDP 在大规模训练中的工程经验与最佳实践。https://arxiv.org/abs/2304.11277
- **[GPipe: Efficient Training of Large Neural Networks using Pipeline Parallelism]** (Huang, Cheng, Bapna, 2019) — 流水线并行的开创性工作，提出 micro-batch 流水调度。https://arxiv.org/abs/1811.06965
- **[Efficient Large-Scale Language Model Training on GPU Clusters]** — NVIDIA Megatron-LM 团队详细讲解 3D 并行实现的工业级论文。https://arxiv.org/abs/2104.04473

### 视频（B站/YouTube）
- **[大模型分布式训练（数据并行/模型并行/流水线并行/ZeRO）]** — 李沐 / B站。https://www.bilibili.com/video/BV1fs4y1s75i/

### 博文/教程
- **[大模型分布式训练技术总结]** — Hugging Face 分布式训练文档。https://huggingface.co/docs/transformers/perf_train_gpu_many
- **[ZeRO & DeepSpeed 原理解析]** — Microsoft DeepSpeed Blog。https://www.deepspeed.ai/tutorials/zero/

### 开源项目
- **[DeepSpeed]** — Microsoft 推出的分布式训练框架，实现 ZeRO 全系列优化。https://github.com/microsoft/DeepSpeed
- **[Megatron-LM]** — NVIDIA 的大规模 Transformer 训练框架，TP/PP/DP 3D 并行。https://github.com/NVIDIA/Megatron-LM
