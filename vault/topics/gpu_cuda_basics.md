---
id: "gpu_cuda_basics"
name: "GPU与CUDA基础"
name_en: "GPU and CUDA Fundamentals"
type: "topic"
level: 3
area: "engineering"
direction: "mlops"
prerequisites: ["neural_network_basics"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["gpu", "cuda", "memory", "bandwidth", "tensor-core", "nvidia"]
---

理解 GPU 体系结构对 AI 从业者不是可选项——推理部署的显存规划、训练的性能瓶颈诊断、模型结构的设计选择，每一步都与硬件特性深度耦合。GPU 架构核心层：(1) CUDA Core——通用浮点计算单元，处理标量运算；(2) Tensor Core——NVIDIA Volta 架构起引入的矩阵乘加专用硬件，支持混合精度（FP16×FP16→FP32 累加，FP8，甚至 Blackwell 的 FP4），单时钟周期完成 4×4 矩阵 D = A×B + C 运算。Tensor Core 的利用率直接决定 Transformer 中 Attention 和 FFN 矩阵乘法的吞吐量。显存层次从快到慢、从小到大：寄存器（每 SM 256KB，单个线程私有）→ L1 Cache/Shared Memory（片上 SRAM，SM 内共享，FlashAttention 的关键优化目标）→ L2 Cache（片外，所有 SM 共享，H100 上 50MB）→ HBM（高带宽显存，H100 上 80GB，带宽 3.35TB/s）→ 主机内存（CPU 侧的 DDR）。Roofline 模型将操作分为两类：(1) 计算密集（如大矩阵乘法）——瓶颈在算力 (FLOPS)；(2) 访存密集（如 Element-wise 激活函数、LayerNorm）——瓶颈在显存带宽。推理场景的显存计算：模型权重 (Model Parameters × Bytes per Param，FP16=2B, INT4=0.5B) + KV Cache (2 × n_layers × hidden_size × max_seq_len × Bytes × batch_size) + 激活值（中间计算结果）。NVIDIA 代际演进：A100 (2020, Ampere, TF32, 80GB, 312 TFLOPS FP16) → H100 (2022, Hopper, Transformer Engine 动态混合精度, 80GB, 989 TFLOPS FP16) → B200 (2024, Blackwell, FP4 支持, 192GB, 芯片互联 NVLink 5.0 1.8TB/s)。性能瓶颈诊断信号：GPU 利用率低但吞吐量低 → 访存瓶颈（小 batch、小矩阵乘法的 Kernel Launch Overhead），需要增大 batch 或合并操作；显存不足 → 需要减少 batch、用量化或梯度检查点。

## Quiz

### Q1
**问题**: 为什么 Transformer 推理中 KV Cache 是显存的主要消耗者而非模型权重本身？（以 H100 80GB 上的 Llama-2-70B FP16 推理为例）

- A. 模型权重的显存占用量远大于 KV Cache
- B. 随着序列长度增加和并发请求增多，KV Cache 线性增长：单请求 4096 token 的 70B 模型，权重占 140GB（需要多卡）但 KV Cache 约 3.2GB；而当 batch_size=32、seq_len=8192 时，KV Cache 膨胀到 204GB，远超权重 ✓
- C. KV Cache 和模型权重的显存消耗始终相等
- D. KV Cache 可以被存储在 CPU 内存中，不影响 GPU 显存

**解析**: 模型权重大小固定：70B × 2 bytes(FP16) = 140GB。KV Cache 大小 = 2 × n_layers × hidden_size × seq_len × batch_size × dtype_bytes。Llama-2-70B: 80 层, hidden_size=8192，单个 token 的 KV 约 2 × 80 × 8192 × 2B = 2.5MB。batch=1, seq_len=4096 → 10GB；batch=32, seq_len=8192 → 655GB。这说明高并发长上下文场景下 KV Cache 是主要瓶颈——量化键值(FP8/INT8 KV Cache)、Multi-Query Attention(减少 KV head 数)、PagedAttention(更高效管理 KV) 等方法都是针对这个问题。权重可以跨请求共享（相同模型），KV Cache 是每个请求私有的——这是推理吞吐和长上下文场景的核心硬件约束。

### Q2
**问题**: Roofline 模型将深度学习算子分为"计算密集"和"访存密集"两类。在一个 FLOPS=312T、HBM Bandwidth=2TB/s 的 A100 上，一个 Arithmetic Intensity = 50 FLOPS/Byte 的算子属于哪类？瓶颈在哪里？

- A. 计算密集，瓶颈在计算 FLOPS；因为 Roofline 转折点 = 312T / 2T = 156 FLOPS/Byte，50 < 156，所以...等一下，让我重新算。50 < 156 说明是访存密集，瓶颈在带宽 ✓
- B. 计算密集，瓶颈在计算 FLOPS
- C. 访存密集，瓶颈在计算 FLOPS
- D. 无法判断，需要更多信息

**解析**: Roofline 模型的关键公式：峰值计算密度 (Arithmetic Intensity threshold) = Peak FLOPS / Peak Bandwidth = 312T / 2TB/s = 156 FLOPS/Byte。AI（Arithmetic Intensity）= FLOPs per operation / Bytes transferred。若 AI > 156 → 计算密集，性能受 FLOPS 限制，达到斜线（斜线区）；若 AI < 156 → 访存密集，性能受带宽限制，在水平线区。50 < 156，该算子是访存密集——换用更快显存比换更多 Tensor Core 更能提升性能。大矩阵乘法 (GEMM) AI 可达数百上千（计算密集），而 ReLU/Dropout/LayerNorm 的 AI 极低（<10），属于访存密集——kernel fusion（合并算子在一次显存读写中完成）是针对访存密集算子的标准优化手段。

### Q3
**问题**: NVIDIA H100 相比 A100 引入的 "Transformer Engine" 解决了什么问题？它与普通混合精度训练有何不同？

- A. 只是名字不同，功能与 AMP（Automatic Mixed Precision）完全相同
- B. Transformer Engine 在每层动态选择 FP8/FP16 精度（Per-Tensor Scaling），通过统计分析激活值的分布范围自动缩放，在保持模型质量的同时利用 FP8 Tensor Core 获得 2x 的吞吐提升，而 AMP 只在 FP16/FP32 之间切换 ✓
- C. Transformer Engine 专门优化 CPU 和 GPU 之间的通信
- D. Transformer Engine 只用于推理，不能用于训练

**解析**: AMP (A100): FP32 master weights + FP16 forward pass + loss scaling，撑死了 2x 提速。H100 Transformer Engine：首次引入 FP8 Tensor Core（E4M3 格式），专为 Transformer 设计——它在每层的线性变换和注意力计算中动态统计张量范围的 max value，据此选择缩放因子，用 FP8 做矩阵乘法，然后 FP16 或 FP32 累积。这使得 GEMM 吞吐翻倍、显存带宽压力减半。关键 challenge 是 FP8 只有 4-bit exponent, 3-bit mantissa，表达范围极窄（约 ±448），容易溢出——Transformer Engine 通过逐张量的缩放因子（软件层面）来处理范围差异。H100 Tensor Core FP8: 2PFLOPS vs FP16: 989TFLOPS，理论翻倍。这解释了为什么 H100 的推理/训练速度不单纯是硬件升级——混合精度策略的演进同等重要。

## 参考资料

### 论文
- **[FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness]** (Dao et al., 2022) — 通过 Tiling 技术将 Attention 计算置于 SRAM 中完成，将 Attention 的显存访问从 O(N²) 降至 O(N)，是理解 GPU 显存层次结构的经典案例。https://arxiv.org/abs/2205.14135

### 视频（B站/YouTube）
- **[GPU Programming and Architecture]** — Stanford CS149 课程。斯坦福并行计算课程，系统讲解 GPU 硬件架构、CUDA 编程模型与性能优化方法，适合深入理解 GPU 计算。https://cs149.stanford.edu/

### 博文/教程
- **[CUDA C++ Programming Guide]** — NVIDIA 官方文档。CUDA 编程权威参考手册，涵盖线程模型、显存层次、Tensor Core 使用和性能调优指南。https://docs.nvidia.com/cuda/cuda-c-programming-guide/
- **[Making Deep Learning Go Brrrr From First Principles]** — Horace He 博客。以 Roofline 模型为核心，深入分析深度学习算子的计算/访存瓶颈与 Kernel Fusion 优化原理。https://horace.io/brrr_intro.html
