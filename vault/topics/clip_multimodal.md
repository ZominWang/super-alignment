---
id: "clip_multimodal"
name: "CLIP与跨模态对齐"
name_en: "CLIP and Cross-Modal Alignment"
type: "topic"
level: 4
area: "llm"
direction: "llm_arch"
prerequisites: ["transformer_arch", "vision_transformer", "embeddings"]
difficulty: 4
importance: 5
status: "unknown"
tags: ["clip", "multimodal", "contrastive-learning", "image-text", "zero-shot"]
---

CLIP（Contrastive Language-Image Pre-training）采用双塔架构，由独立的图像编码器（ViT 或 ResNet）与文本编码器（Transformer）组成，通过对比学习在 4 亿图文对上对齐两个模态的表示空间。训练目标为 InfoNCE Loss：将同一图文对的嵌入拉近，将不匹配的图文对嵌入推远，本质是在 batch 内做 N×N 的对称交叉熵分类。这赋予 CLIP 强大的零样本分类能力：将类别名称模板化为文本（"a photo of a {class}"），与图像嵌入计算余弦相似度即可分类，无需任何微调。ALIGN 以更大规模噪声数据证明了同样的范式。BLIP 引入了生成式目标（图像描述）与判别式目标的联合训练；BLIP-2 进一步提出 Q-Former 模块，用轻量 Transformer 桥接冻结的视觉编码器与冻结的 LLM，成为视觉语言模型的主流连接方案。SigLIP 将 CLIP 的 softmax 对比损失替换为 sigmoid loss，使每个图文对独立二分类，消除对大 batch 的依赖。CLIP 的文本编码器已被 DALL-E 2/3、Stable Diffusion 等生成模型直接复用作为文本条件，成为多模态生态的基础设施。

## Quiz

### Q1
**问题**: CLIP 实现零样本图像分类的核心机制是什么？

- A. CLIP 在 ImageNet 上进行了有监督的分类头微调
- B. 将候选类别名称填入文本模板（如"a photo of a {class}"）生成文本嵌入，与图像嵌入计算余弦相似度，相似度最高的类别即为预测结果，全程无需任何标注数据微调  ✓
- C. CLIP 使用强化学习从人类反馈中学习分类规则
- D. 图像编码器内置了 ImageNet 的 1000 个类别分类头

**解析**: CLIP 通过对比学习将图像和文本嵌入对齐到同一空间。零样本分类时，将所有候选类别（如 ImageNet 1000 类）逐一填入 prompt 模板生成文本嵌入向量，再将待分类图像编码为图像嵌入，计算与每个类别文本嵌入的余弦相似度，取最高分的类别作为预测。这利用了 CLIP 训练时学到的语义对齐，不需要见过该分类任务的任何标注样本。Prompt engineering（如使用多个模板集成）可进一步提升零样本性能。

### Q2
**问题**: BLIP-2 引入 Q-Former（Querying Transformer）模块主要为了解决什么问题？

- A. 加速图像编码器的推理速度，减少计算开销
- B. 通过轻量可训练的 Q-Former 桥接冻结的视觉编码器与冻结的大语言模型，弥合视觉特征空间与 LLM 语言特征空间之间的模态对齐 Gap，同时避免全量微调两个大模型  ✓
- C. 替代 CLIP 的对比损失，改用生成损失训练视觉编码器
- D. 实现图像生成功能，将 LLM 的文本输出转换为图像

**解析**: 直接将视觉编码器的输出拼接到 LLM 输入存在两个问题：① 视觉特征（如 ViT 的 patch token）数量多，序列长，计算代价高；② 视觉特征空间与 LLM 的词嵌入空间语义不对齐，LLM 难以理解视觉信号。Q-Former 包含一组可学习的 Query Token，通过交叉注意力从视觉编码器提取固定数量的信息性视觉特征，再作为软提示输入 LLM。整个训练只需更新 Q-Former 参数，冻结视觉编码器和 LLM，参数高效，是后续 LLaVA、InternVL 等 VLM 设计的重要参考。

### Q3
**问题**: SigLIP 相比 CLIP 的对比损失做了什么改进，解决了什么实际问题？

- A. SigLIP 增大了 batch size，引入更多负样本提升训练效果
- B. 将 softmax 对比损失替换为 sigmoid loss，使每个图文对作为独立的二分类问题（匹配/不匹配），消除对超大 batch 的依赖，且不需要跨设备同步全局负样本  ✓
- C. SigLIP 引入了生成式损失（caption loss）辅助对比学习
- D. SigLIP 仅改变了图像编码器结构，损失函数与 CLIP 相同

**解析**: CLIP 的 InfoNCE Loss 本质上是 softmax 分类：在 batch 内 N 个图像中找到与某文本匹配的那一个，反之亦然。这要求 softmax 分母对全 batch 所有样本求和，N 越大负样本越多越好，实践中需要极大 batch（CLIP 用 32768）并在多卡同步，工程成本高。SigLIP 将每个（图，文）对独立视为二元分类：匹配对目标为 1，不匹配对目标为 0，损失为 sigmoid 交叉熵之和。这样每个样本对独立计算，无需全局归一化，可在较小 batch 下训练，且更易于分布式扩展，实验表明性能持平或超越 CLIP。

## 参考资料

### 论文
- **[Learning Transferable Visual Models From Natural Language Supervision]** (Radford et al., 2021) — CLIP 原论文，4 亿图文对对比预训练，首次大规模验证图文对齐与零样本迁移。https://arxiv.org/abs/2103.00020
- **[Scaling Up Visual and Vision-Language Representation Learning With Noisy Text Supervision]** (Jia et al., 2021) — ALIGN，18 亿噪声图文对，证明规模可弥补数据质量。https://arxiv.org/abs/2102.05918
- **[BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models]** (Li et al., 2023) — 提出 Q-Former 高效桥接视觉编码器与 LLM，成为 VLM 主流范式。https://arxiv.org/abs/2301.12597
- **[Sigmoid Loss for Language Image Pre-Training]** (Zhai et al., 2023) — SigLIP，sigmoid loss 替代 softmax 对比损失，无需大 batch 即可高效训练。https://arxiv.org/abs/2303.15343
- **[Hierarchical Text-Conditional Image Generation with CLIP Latents]** (Ramesh et al., 2022) — DALL-E 2，复用 CLIP 图像/文本嵌入作为扩散模型条件。https://arxiv.org/abs/2204.06125

### 视频（B站/YouTube）
- **[CLIP论文精读]** — 李沐 / B站。https://www.bilibili.com/video/BV1SL4y1s7LQ/
- **[CLIP Explained]** — Yannic Kilcher / YouTube。https://www.youtube.com/watch?v=T9XSU0pKX2E

### 博文/教程
- **[OpenAI CLIP Blog]** — OpenAI 官方博客，介绍 CLIP 的训练细节与零样本能力。https://openai.com/research/clip
- **[Understanding Contrastive Loss]** — Lilian Weng / Lil'Log。详细推导 InfoNCE 与对比学习理论基础。https://lilianweng.github.io/posts/2021-05-31-contrastive/

### 开源项目
- **[open_clip]** — OpenCLIP，CLIP/SigLIP 的开源复现与多种变体。https://github.com/mlfoundations/open_clip
- **[LAION-5B]** — 50 亿图文对开源数据集，CLIP 规模训练的公开基础。https://laion.ai/blog/laion-5b/
