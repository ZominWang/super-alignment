---
id: "inference_serving"
name: "LLM推理服务框架"
name_en: "LLM Inference Serving Frameworks"
type: "topic"
level: 3
area: "engineering"
direction: "mlops"
prerequisites: ["containerization", "model_quantization"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["inference", "serving", "vllm", "sglang", "tgi", "tensorrt-llm"]
---

LLM 推理服务框架面向一个核心挑战：如何在有限 GPU 显存下最大化吞吐量和最小化延迟。vLLM 是该领域的事实标准，其关键创新是 PagedAttention——将 KV Cache 像操作系统的虚拟内存一样按固定大小的"页"（Page）管理，解决了传统连续分配导致的显存碎片化问题，使显存利用率从 20-40% 提升到近 100%。连续批处理（Continuous Batching）允许不同序列在生成不同长度的 token 时动态进出批次，避免了静态批处理中"快完成"的序列阻塞其他序列导致的 GPU 空闲。SGLang 在 vLLM 基础上引入 RadixAttention，通过前缀树（Radix Tree）自动识别和缓存共享前缀（如 System Prompt），多用户请求间共享 KV Cache；同时提供 SGLang DSL 语言简化编程式生成流程。TensorRT-LLM 采用编译优化路径：对模型图进行层融合、kernel 自动调优、量化（FP8/INT8/INT4）并生成高度优化的推理引擎，配合 NVIDIA Triton Inference Server 实现生产级部署，在 H100 等新硬件上性能领先。HuggingFace TGI 的生态优势在于与 HF Hub 无缝集成、支持多模型 Watermarking、Grammars 约束解码，适合对生态兼容性要求高的团队。选型上，通用场景优先 vLLM，极致性能优先 TensorRT-LLM（但需编译成本），多租户高并发优先 SGLang，快速原型优先 TGI。

## Quiz

### Q1
**问题**: vLLM 的 PagedAttention 解决的核心问题是什么？

- A. 注意力计算速度过慢影响吞吐量
- B. KV Cache 的内存碎片化：传统方案为每个序列预留最大长度连续的 KV Cache 空间，导致显存实际利用率通常低于 40%；PagedAttention 按"页"（Page/Block）非连续分配，近似消除碎片  ✓
- C. 多 GPU 之间 KV Cache 的传输延迟
- D. 长序列推理时的数值溢出问题

**解析**: LLM 的自回归生成中，每一层的 K 和 V 需要缓存起来避免重复计算（KV Cache）。传统方案（如 HuggingFace Transformers）为每个请求预先分配一段连续显存，但序列长度不确定——短的浪费空间，长的需要重新分配，造成大量碎片。PagedAttention 将 KV Cache 划分为固定大小的 Block（如 16 或 32 个 token），按需分配，不同请求的 Block 可以交错存储在物理显存中，类似操作系统的虚拟内存分页。这使得 vLLM 的显存利用率接近 100%，在批量推理时吞吐量可达传统方案的 24 倍。

### Q2
**问题**: SGLang 的 RadixAttention 相比 vLLM 的 KV Cache 管理有什么额外优势？

- A. 支持更多种类的 GPU 硬件
- B. 通过前缀树（Radix Tree）结构自动识别不同请求之间的共享前缀（如 System Prompt），这些公共前缀只计算一次并共享缓存，大幅减少冗余计算和显存占用  ✓
- C. 使用 FP4 精度进一步压缩 KV Cache
- D. 支持跨节点的分布式 KV Cache

**解析**: 在多租户服务场景中，不同用户可能有相同的 System Prompt 或共享上下文（如调用同一工具返回的结果）。vLLM 采用 prefix caching 的显式匹配机制，而 RadixAttention 将 KV Cache 组织为基数树结构——新请求到来时自动沿树匹配最长公共前缀，命中节点直接复用其 KV Cache，只需计算新增部分。在 Chatbot Arena 等基准中，SGLang 比 vLLM 在相同 GPU 下高出 5 倍吞吐量。

### Q3
**问题**: 在同等硬件（如 A100 80G）上部署 Llama 3 8B 模型，以下哪种场景选择 TensorRT-LLM 而非 vLLM 是合理的？

- A. 需要快速集成自定义 Python 代码实现业务逻辑
- B. 需要在 H100 GPU 上部署并充分利用 FP8 格式的硬件加速特性，且已构建完成编译流水线的生产环境  ✓
- C. 需要动态切换不同模型进行 A/B 测试
- D. 开发阶段快速原型验证，迭代周期要求极短

**解析**: TensorRT-LLM 的性能优势依赖于编译阶段对特定模型 + 特定硬件 + 特定配置（batch size / 序列长度 / 量化精度）的深度优化，编译过程可能耗时数十分钟到数小时。这适合"模型固定、环境固定、长期运行"的生产部署场景，尤其在 H100 上利用 Transformer Engine 的 FP8 自动转换可额外获约 2 倍吞吐提升。vLLM 的优势在于无编译成本，"下载即运行"，对快速迭代友好的同时也提供优秀的 PagedAttention 性能，适合通用场景。

## 参考资料

### 论文
- **[Efficient Memory Management for Large Language Model Serving with PagedAttention]** (Kwon et al., 2023) —— vLLM 论文，提出 PagedAttention 和连续批处理，将 KV Cache 显存利用率提升至接近 100%。https://arxiv.org/abs/2309.06180

### 开源项目
- **[vLLM]** —— 高性能 LLM 推理服务框架，PagedAttention 和连续批处理的工业级实现。https://github.com/vllm-project/vllm
- **[SGLang]** —— 基于 RadixAttention 的推理框架，通过前缀树实现跨请求 KV Cache 共享。https://github.com/sgl-project/sglang
