---
id: "vision_transformer"
name: "Vision Transformer (ViT)"
name_en: "Vision Transformer"
type: "topic"
level: 4
area: "llm"
direction: "llm_arch"
prerequisites: ["transformer_arch", "attention_mechanism"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["vit", "vision-transformer", "image-classification", "patch-embedding", "multimodal"]
---

Vision Transformer（ViT）将图像切分为固定大小的 patch（如 16×16 像素），每个 patch 展平后线性投影为向量，加上可学习的位置编码后送入标准 Transformer 编码器。与 CNN 不同，ViT 不具备局部感受野和平移等变性等空间归纳偏置，因此在小数据集上效果不如 CNN，但在 ImageNet-21k、JFT 等大规模数据集预训练后表现显著超越 CNN。DeiT 通过知识蒸馏和数据增强策略大幅提升了 ViT 在中等规模数据集上的效率，无需海量数据即可媲美 ResNet。DINO 和 MAE 将自监督学习引入 ViT：DINO 利用自蒸馏学习语义丰富的特征，MAE 随机掩盖 75% 的图像 patch 并重建像素，以高效低成本方式预训练 ViT。Swin Transformer 引入层级结构和局部窗口注意力，将注意力复杂度从 O(n²) 降至线性，适合高分辨率目标检测和分割任务。ViT 已成为 CLIP、GPT-4V、Gemini 等多模态模型的视觉骨干，是连接视觉与语言的核心组件。

## Quiz

### Q1
**问题**: ViT 相比 CNN 最根本的架构差异是什么，这导致了什么训练特性？

- A. ViT 使用更深的网络，导致训练时间更长
- B. ViT 缺乏局部感受野和平移等变性等空间归纳偏置，需要更大规模的数据或预训练才能学到有效的视觉特征  ✓
- C. ViT 不支持批归一化，因此训练不稳定
- D. ViT 每层参数量更少，表达能力弱于 CNN

**解析**: CNN 的卷积核天然具备局部连接（仅看邻近像素）和权重共享（平移等变）两种归纳偏置，使其在小数据集上即可收敛到良好的特征表示。ViT 用全局自注意力处理图像 patch，没有内置这两种先验，模型必须从数据中自行学习空间关系。这使 ViT 在小/中等数据集上不如 ResNet，但在 ImageNet-21k、JFT-300M 等超大规模数据集预训练后，可以学到更强的全局语义特征并超越 CNN。

### Q2
**问题**: Swin Transformer 相比原始 ViT 引入窗口注意力（Window Attention）的主要动机是什么？

- A. 窗口注意力可以增加感受野，提升图像分类精度
- B. 将全局自注意力限制在局部窗口内，将计算复杂度从 O(n²) 降为与图像大小成线性，并通过层级结构支持高分辨率的密集预测任务  ✓
- C. 减少位置编码的维度，降低存储开销
- D. 窗口注意力与卷积等价，可复用 CNN 预训练权重

**解析**: 标准 ViT 中每个 patch 与所有其他 patch 计算注意力，复杂度为 O(n²)（n 为 patch 数量）。高分辨率图像的 patch 数极多，计算和内存开销难以承受。Swin Transformer 将图像划分为不重叠的局部窗口，每个窗口内独立计算注意力（复杂度线性于图像大小），再通过交替的 shifted window 跨窗口传递信息。层级设计则使特征图随深度逐步下采样，适合目标检测（FPN）和语义分割等需要多尺度特征的任务。

### Q3
**问题**: MAE（Masked Autoencoder）的预训练策略与 BERT 的 MLM 相比，为何能以极高效率预训练 ViT？

- A. MAE 使用更小的模型，减少了计算量
- B. MAE 随机掩盖 75% 的图像 patch，编码器只处理可见的 25% patch，再用轻量解码器重建掩盖区域的像素，极大减少编码器的计算量并迫使模型学习丰富的视觉语义  ✓
- C. MAE 用分类标签监督，比无监督重建更高效
- D. MAE 在文本数据上预训练，再迁移到图像

**解析**: BERT 对所有 token 都进行编码，只掩盖 15% 做预测。MAE 发现图像存在大量冗余：相邻 patch 高度相关，因此可以掩盖高达 75% 的 patch，编码器只需处理剩余 25% 的可见 patch（计算量降为 1/4），再用极轻量的解码器（仅 8 个 Transformer Block）重建被掩盖 patch 的像素值。高掩盖率迫使模型超越简单插值，学习高层语义理解；同时大幅减少编码器计算，使大规模 ViT（ViT-H）的预训练成本可接受。

## 参考资料

### 论文
- **[An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale]** (Dosovitskiy et al., 2021) — ViT 原论文，首次将纯 Transformer 应用于图像分类，证明大规模预训练后效果超越 CNN。https://arxiv.org/abs/2010.11929
- **[Training data-efficient image transformers & distillation through attention]** (Touvron et al., 2021) — DeiT，通过知识蒸馏与数据增强策略，使 ViT 无需 JFT 等超大数据集即可训练。https://arxiv.org/abs/2012.12877
- **[Swin Transformer: Hierarchical Vision Transformer using Shifted Windows]** (Liu et al., 2021) — 引入层级结构和窗口注意力，将 ViT 扩展到目标检测与分割任务。https://arxiv.org/abs/2103.14030
- **[Masked Autoencoders Are Scalable Vision Learners]** (He et al., 2022) — MAE，以 75% 高掩盖率高效自监督预训练 ViT，大幅降低预训练成本。https://arxiv.org/abs/2111.06377
- **[Emerging Properties in Self-Supervised Vision Transformers]** (Caron et al., 2021) — DINO，自蒸馏自监督学习，ViT 特征自然涌现出语义分割能力。https://arxiv.org/abs/2104.14294

### 视频（B站/YouTube）
- **[ViT论文精读]** — 李沐 / B站。https://www.bilibili.com/video/BV15P4y137jb/
- **[Let's build ViT from scratch]** — Andrej Karpathy / YouTube。https://www.youtube.com/@AndrejKarpathy

### 博文/教程
- **[The Illustrated Vision Transformer]** — Jay Alammar。以可视化方式详解 ViT patch embedding 与位置编码。
- **[Vision Transformers Need Registers]** — Darcet et al., 2023，解释 ViT 特征图中的 artifact 现象。https://arxiv.org/abs/2309.16588
