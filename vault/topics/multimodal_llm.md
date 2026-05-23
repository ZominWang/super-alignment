---
id: "multimodal_llm"
name: "多模态大语言模型"
name_en: "Multimodal Large Language Models"
type: "topic"
level: 4
area: "llm"
direction: "llm_arch"
prerequisites: ["transformer_arch", "clip_multimodal", "sft"]
difficulty: 4
importance: 5
status: "unknown"
tags: ["multimodal-llm", "vision-language", "llava", "gpt-4v", "gemini", "instruction-tuning"]
---

多模态大语言模型（VLM，Vision-Language Model）的主流架构由三部分组成：视觉编码器（Vision Encoder，通常为 CLIP ViT）负责提取图像特征，连接器/投影层（Connector/Projector）负责将视觉特征映射到 LLM 的词嵌入空间，以及语言模型主干（LLM，如 LLaMA/Mistral）负责多模态理解与生成。LLaVA 系列是开源 VLM 的代表：Stage-1 冻结视觉编码器与 LLM，仅训练 MLP Projector 完成特征空间对齐；Stage-2 在视觉指令数据集上全量微调实现指令遵循能力。GPT-4V 和 Gemini 将多模态能力推向商业高度，支持复杂推理、图表理解与多图交叉比较。开源侧，Qwen-VL 和 InternVL 在中英双语场景及 OCR/文档理解上表现突出，InternVL 系列在多个基准已接近闭源模型。Video LLM（如 Video-LLaVA）面临帧采样策略与时序建模两大挑战：如何在有限 token 预算内保留关键帧，以及如何建模帧间时序关系。理解与生成存在分工：VLM 擅长视觉问答、描述、推理，图像生成则依赖 Diffusion Model；部分统一模型（如 Janus）尝试在同一框架内整合两者。

## Quiz

### Q1
**问题**: LLaVA 两阶段训练各自的目标是什么，为什么需要分开训练？

- A. Stage-1 训练语言模型，Stage-2 训练视觉编码器，分开以防梯度冲突
- B. Stage-1 冻结视觉编码器和 LLM，仅训练 Projector 使视觉特征对齐到 LLM 的词嵌入空间；Stage-2 解冻 LLM（或全模型）在视觉指令数据上微调，赋予模型遵循多模态指令的能力  ✓
- C. Stage-1 在图文对上无监督预训练，Stage-2 在纯文本上有监督微调
- D. 两阶段训练目标相同，Stage-2 只是使用更大的 batch size

**解析**: 两阶段设计源于模态对齐与指令微调的不同目标。Stage-1（特征对齐预训练）使用大规模图文描述数据（如 CC-595K），仅训练 MLP Projector，使视觉编码器输出的图像 token 能被 LLM "读懂"——此时 LLM 不需要更新，避免破坏语言能力。Stage-2（视觉指令微调）使用高质量视觉问答/指令数据（如 LLaVA-Instruct-150K），更新 Projector 和 LLM（有时冻结视觉编码器），让模型学会根据图像内容遵循多样化指令。这种分阶段策略训练高效，也是 BLIP-2、InstructBLIP 等模型的共同设计思路。

### Q2
**问题**: VLM 中 Connector/Projector 模块的核心作用是什么？

- A. 对图像进行预处理（裁剪、归一化），将其转换为标准分辨率
- B. 将视觉编码器输出的图像特征 token 从视觉特征空间映射到 LLM 的词嵌入空间，使 LLM 能将图像 token 与文本 token 统一处理  ✓
- C. 对 LLM 的输出进行后处理，将文本解码为图像坐标
- D. 存储视觉问答的历史对话，为 LLM 提供上下文

**解析**: 视觉编码器（如 CLIP ViT-L）输出的特征向量维度（如 1024 维）和语义空间与 LLM 词嵌入（如 LLaMA 的 4096 维）不匹配。Projector 的作用就是搭建这座桥梁：LLaVA 使用简单的两层 MLP，BLIP-2 使用 Q-Former（带可学习 Query 的交叉注意力），InternVL 使用像素混洗（Pixel Shuffle）下采样后接 MLP。通过 Projector，图像可被表示为一系列"视觉 token"，与文本 token 直接拼接送入 LLM，实现统一的自回归建模。Projector 的设计直接影响视觉信息的保留程度与 LLM 处理的效率。

### Q3
**问题**: 为什么 GPT-4V 这类 VLM 负责视觉理解，而图像生成通常仍依赖 Stable Diffusion 等扩散模型？

- A. VLM 的训练数据中没有图像，因此无法生成图像
- B. VLM 基于自回归 LLM，擅长序列推理和语义理解，但直接在像素空间生成高质量图像的效率远低于扩散模型；扩散模型通过迭代去噪在连续像素空间采样，天然适合生成多样、高保真的图像  ✓
- C. VLM 的参数量不足，无法支撑图像生成所需的计算
- D. 法规禁止同一模型同时处理理解和生成任务

**解析**: VLM 将图像理解转化为"阅读"任务：图像被编码为有限数量的视觉 token 参与自回归推理，擅长分析、描述、回答关于图像内容的问题。但自回归地生成像素序列（如 256×256 = 65536 个像素）既低效又难以捕捉图像的空间结构。扩散模型从高斯噪声出发，通过数百步 U-Net 去噪逐步恢复清晰图像，配合 CLIP/T5 文本编码器引导，在生成质量和多样性上远胜自回归方法。目前也有尝试统一两种能力的工作（如 Janus、Unified-IO），但大多数生产系统仍保持理解与生成的分工架构。

## 参考资料

### 论文
- **[Visual Instruction Tuning]** (Liu et al., 2024) — LLaVA，首次提出用 GPT-4 生成视觉指令数据并两阶段训练 VLM 的完整方法论。https://arxiv.org/abs/2304.08485
- **[Improved Baselines with Visual Instruction Tuning]** (Liu et al., 2023) — LLaVA-1.5，将 Projector 改为 MLP 并使用学术任务数据，大幅提升基准性能。https://arxiv.org/abs/2310.03744
- **[GPT-4 Technical Report]** (OpenAI, 2023) — GPT-4V 多模态能力的官方技术报告，描述视觉输入的处理方式与能力边界。https://arxiv.org/abs/2303.08774
- **[Gemini: A Family of Highly Capable Multimodal Models]** (Google, 2023) — Gemini 技术报告，原生多模态（非后期拼接）架构，支持视频、音频、图像、文本联合建模。https://arxiv.org/abs/2312.11805
- **[InternVL: Scaling up Vision Foundation Models and Aligning for Generic Visual-Linguistic Tasks]** (Chen et al., 2024) — InternVL，开源 VLM 在多个基准接近闭源模型，强调大视觉编码器与动态分辨率处理。https://arxiv.org/abs/2312.14238

### 视频（B站/YouTube）
- **[LLaVA论文精读]** — 李沐 / B站。https://www.bilibili.com/video/BV1jN411D7uk/
- **[Multimodal LLMs Explained]** — Andrej Karpathy / YouTube。https://www.youtube.com/@AndrejKarpathy

### 博文/教程
- **[A Survey on Multimodal Large Language Models]** — Zhang et al., 2024，系统综述 VLM 架构、训练数据与基准评测。https://arxiv.org/abs/2306.13549
- **[LLaVA 官方博客]** — 详解视觉指令数据构造与两阶段训练流程。https://llava-vl.github.io/

### 开源项目
- **[LLaVA]** — 开源视觉语言模型，代码与模型权重完整开放。https://github.com/haotian-liu/LLaVA
- **[InternVL]** — 开源 VLM，支持高分辨率图像与 OCR/文档理解场景。https://github.com/OpenGVLab/InternVL
