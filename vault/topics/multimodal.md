---
id: "multimodal"
name: "多模态模型"
name_en: "Multimodal Models"
type: "topic"
level: 3
area: "llm"
direction: "llm_inference"
prerequisites: ["pretrained_lm"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["llm", "multimodal", "vision", "audio", "CLIP", "GPT-4V"]
---

多模态模型将文本与图像、音频、视频等模态统一在同一框架下，实现跨模态的理解和生成。CLIP 的对比学习对齐视觉和语言空间，LLaVA 等视觉语言模型（VLM）将图像编码器与 LLM 连接，GPT-4o 代表了原生多模态的新方向。

## Quiz

### Q1
**问题**: CLIP 的训练目标是什么，为什么这种方式能学到强大的视觉-语言对齐？

- A. 对图像生成文字描述，对文字生成配图
- B. 使图像编码器和文本编码器对匹配的图文对输出相似向量，对不匹配的对输出不相似向量（对比学习）  ✓
- C. 让视觉模型和语言模型共享同一套权重
- D. 使用人工标注的图像类别标签训练分类器

**解析**: CLIP（Contrastive Language-Image Pre-training）使用 4 亿图文对训练，InfoNCE 损失使配对的图文嵌入余弦相似度最大，使不配对的最小。无需人工标注，完全自监督。这使 CLIP 具备零样本分类能力：将目标类别描述为文字，找到最相似的图像嵌入即可分类。

### Q2
**问题**: LLaVA 等视觉语言模型（VLM）是如何将图像"输入"给语言模型的？

- A. 将图像转换为像素值数组，与文本 token 拼接
- B. 用视觉编码器（如 CLIP）提取图像特征，通过线性层或 MLP 投影为"视觉 token"，与文本 token 一同输入 LLM  ✓
- C. 训练语言模型直接处理图像像素
- D. 先用图像描述模型生成文本，再输入 LLM

**解析**: LLaVA 的架构：图像 → CLIP 视觉编码器 → 线性投影层 → 视觉 token → 与文本 token 拼接 → LLM。视觉 token 与文本 token 在同一序列中处理，LLM 通过注意力机制融合视觉和语言信息。训练分两阶段：先训练投影层对齐，再端到端指令微调。

### Q3
**问题**: GPT-4o 的"原生多模态"相比"串联多模态"（如文字+图像分别处理再融合）的核心区别是？

- A. 原生多模态模型更大，参数量更多
- B. 原生多模态从底层统一表示不同模态，实现真正的跨模态推理和实时交互（如语音对话）  ✓
- C. 原生多模态不需要视觉编码器
- D. 两者在性能上没有本质区别

**解析**: 串联方式将各模态独立编码再融合，模态间交互有限，且切换模态有延迟（如语音→文字→LLM→语音）。原生多模态在 token 层面统一所有模态，可以做到实时语音对话（低延迟），以及真正理解图像中的时序信息（视频）。GPT-4o 展示了这一方向的潜力。

## 参考资料

### 论文
- **[Flamingo: a Visual Language Model for Few-Shot Learning]** (Alayrac et al., 2022) — DeepMind 提出 Flamingo，通过 Perceiver Resampler 将视觉特征注入冻结 LLM，实现强大的少样本视觉问答能力，是 VLM 领域的奠基工作之一。https://arxiv.org/abs/2204.14198
- **[Visual Instruction Tuning (LLaVA)]** (Liu et al., 2024) — 提出用 GPT-4 生成视觉指令微调数据，以极低成本训练出性能接近专有模型的开源视觉语言模型。https://arxiv.org/abs/2304.08485
- **[Learning Transferable Visual Models From Natural Language Supervision (CLIP)]** (Radford et al., 2021) — OpenAI 提出 CLIP，用 4 亿图文对进行对比学习，奠定视觉-语言对齐嵌入空间的基础。https://arxiv.org/abs/2103.00020
