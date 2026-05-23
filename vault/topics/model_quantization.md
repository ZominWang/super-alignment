---
id: "model_quantization"
name: "模型量化"
name_en: "Model Quantization"
type: "topic"
level: 3
area: "llm"
direction: "llm_inference"
prerequisites: ["llm_pretraining"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["llm", "quantization", "int8", "int4", "deployment"]
---

模型量化将浮点权重压缩为低精度整数（INT8/INT4），大幅减少内存占用和推理延迟。GPTQ（训练后量化）、AWQ（激活感知量化）、GGUF（llama.cpp使用格式）是主流量化方案，使在消费级硬件运行大模型成为可能。

## Quiz

### Q1
**问题**: 训练后量化（Post-Training Quantization, PTQ）相比量化感知训练（Quantization-Aware Training, QAT）的主要权衡是？

- A. PTQ 精度更高但速度更慢
- B. PTQ 不需要重新训练，部署方便但精度损失较大；QAT 在训练中模拟量化，精度损失更小  ✓
- C. QAT 只能用于 INT8 量化
- D. PTQ 是 LLM 专用的量化方法

**解析**: PTQ 在已训练的模型上直接量化权重，无需训练数据和 GPU 时间，是最便捷的部署方案。但低比特（INT4）时精度损失明显。QAT 在前向传播中插入"伪量化"节点，让模型学习适应量化误差，精度更好但需要训练资源。GPTQ 是面向 LLM 的高精度 PTQ 方案。

### Q2
**问题**: AWQ（Activation-Aware Weight Quantization）的核心创新是什么？

- A. 对激活值而非权重进行量化
- B. 识别对激活值影响最大的"显著权重"，对其保留更高精度或进行缩放  ✓
- C. 使用更大的量化块大小
- D. 结合 LoRA 进行量化

**解析**: AWQ（Lin 等，2023）发现只有约 1% 的权重通道对模型输出至关重要（对应激活值分布偏斜的通道）。对这些通道在量化前进行缩放（不实际保留更高精度），可以显著减少量化误差。AWQ 是 Qwen、LLaMA 等模型的主流量化格式。

### Q3
**问题**: GGUF 格式（llama.cpp 使用）的主要优势是什么？

- A. GGUF 提供最高的量化精度
- B. 单文件格式包含模型权重和元数据，支持 CPU 推理和混合精度（部分层在 GPU 运行）  ✓
- C. GGUF 是 Hugging Face 的官方格式
- D. GGUF 只支持 INT8 量化

**解析**: GGUF（GGML Unified Format）将整个模型打包为单个文件，llama.cpp 可以在纯 CPU 上运行，也支持将部分层卸载到 GPU（--n-gpu-layers）。支持 Q4_K_M、Q8_0 等多种量化级别，是个人在 MacBook 等设备上运行大模型的主流方案。

## 参考资料

### 论文
- **[LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale]**(Dettmers et al., 2022) — 首次将 INT8 量化应用于大规模 Transformer，解决异常值问题。https://arxiv.org/abs/2208.07339
- **[GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers]**(Frantar et al., 2023) — 基于最优脑手术（OBS）的逐层量化方法，实现高精度 INT4 量化。https://arxiv.org/abs/2210.17323
- **[QLoRA: Efficient Finetuning of Quantized Language Models]**(Dettmers et al., 2023) — 4-bit 量化结合 LoRA 微调，使消费级 GPU 可微调大模型。https://arxiv.org/abs/2305.14314
