---
id: "diffusion_models"
name: "扩散模型"
name_en: "Diffusion Models"
type: "topic"
level: 3
area: "foundations"
direction: "deep_learning"
prerequisites: ["neural_network_basics", "probability_statistics"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["diffusion", "generative", "image-generation", "ddpm", "stable-diffusion"]
---

扩散模型通过逐步向数据添加噪声再学习去噪的过程实现生成，核心包含前向扩散过程（马尔可夫链逐步加高斯噪声）和反向去噪过程（神经网络学习逆转噪声）。DDPM 奠定了去噪扩散概率模型的基础框架，DDIM 通过非马尔可夫采样加速了生成过程，Score-based 视角将扩散统一为 score matching 的 SDE/ODE 形式。Stable Diffusion 在潜空间（Latent Space）而非像素空间进行扩散，通过 VAE 编码器压缩、UNet 在潜空间去噪、CLIP 文本编码器注入语义条件，大幅降低计算成本。Classifier-Free Guidance（CFG）通过联合训练条件/无条件模型，推理时外推二者差量来增强文本对齐度，是目前文生图模型的标准技术。与 GAN 相比，扩散模型训练稳定、模式覆盖更全，但生成速度较慢；与 VAE 相比，样本质量更高但缺乏显式潜变量推断。关键论文：Ho et al. 2020 "Denoising Diffusion Probabilistic Models", Song et al. 2021 "Score-Based Generative Modeling", Rombach et al. 2022 "High-Resolution Image Synthesis with Latent Diffusion Models"。

## Quiz

### Q1
**问题**: 扩散模型中"前向过程"（Forward Process）的核心操作是什么？

- A. 从纯噪声采样，通过神经网络逐步生成清晰图像
- B. 逐步向数据添加高斯噪声，最终逼近标准正态分布，形成一个马尔可夫链 ✓
- C. 使用 GAN 的判别器评估生成图像质量
- D. 将高维数据压缩到低维潜空间

**解析**: 前向扩散过程 q(x_t|x_{t-1})=N(x_t; √(1-β_t)·x_{t-1}, β_t·I)，在 T 个时间步上逐步添加方差为 β_t 的高斯噪声。当 T 足够大时，x_T 近似服从 N(0,I)，完全破坏原始数据结构。这一过程是固定的（无参数），为反向去噪提供了训练目标：预测 z ~ N(0,I) 中的噪声分量。巧妙之处在于，任意时间步的 x_t 可以直接从 x_0 解析采样，无需迭代 T 步。

### Q2
**问题**: Stable Diffusion 在潜空间（Latent Space）而非像素空间进行扩散的根本原因是什么？

- A. 潜空间扩散可以实现文本到图像的控制
- B. 大幅降低计算成本：预训练 VAE 将高分辨率图像压缩 4-8 倍，UNet 在低维潜空间运行 ✓
- C. 潜空间表示更易于理解
- D. VAE 编码器本身就能去噪

**解析**: 若在 512×512×3 的像素空间做扩散，UNet 需处理约 78 万个维度的张量，训练和推理极其昂贵。Latent Diffusion 先训练 VAE 将图像压缩到 64×64×4 的潜空间（如 f=8 下采样），维度降低约 48 倍。UNet 在潜空间去噪后，VAE 解码器恢复原分辨率。这一设计使得 Stable Diffusion 能在消费级 GPU 上运行，是扩散模型走向实用的关键突破。

### Q3
**问题**: Classifier-Free Guidance（CFG）中，guidance_scale > 1 时的推理过程如何操作？

- A. 先训练一个分类器，再用分类器梯度引导生成方向
- B. 同时运行条件模型和无条件模型的预测，通过 ϵ̂_cond + w·(ϵ̂_cond - ϵ̂_uncond) 外推，放大条件信号 ✓
- C. 只使用文本条件的模型进行推理
- D. 对生成结果进行多次迭代 refinement

**解析**: CFG 训练时以一定概率（通常 10-20%）将文本条件替换为空嵌入，使同一 UNet 同时学会条件和无条件生成。推理时计算噪声预测：ϵ̂_guided = ϵ̂_uncond + w·(ϵ̂_cond − ϵ̂_uncond)，w 为 guidance scale（通常 7-9）。w=1 退化为标准条件生成，w>1 增强文本对齐但降低多样性，w 过大会导致过饱和和伪影。CFG 避免了额外训练分类器的开销，成为 SD/Imagen/DALL·E 2 的标准配置。

## 参考资料

### 论文
- **[Denoising Diffusion Probabilistic Models]** (Ho, Jain, Abbeel, 2020) — DDPM 奠基性工作，提出通过马尔可夫链逐步加噪/去噪的扩散生成框架。https://arxiv.org/abs/2006.11239
- **[Score-Based Generative Modeling through Stochastic Differential Equations]** (Song, Sohl-Dickstein, Kingma, 2021) — 将扩散模型统一为连续时间 SDE 框架，提出 predictor-corrector 采样和 ODE 确定性采样。https://arxiv.org/abs/2011.13456
- **[Denoising Diffusion Implicit Models]** (Song, Meng, Ermon, 2020) — 提出非马尔可夫确定性采样（DDIM），实现 10-50 倍加速生成。https://arxiv.org/abs/2010.02502
- **[High-Resolution Image Synthesis with Latent Diffusion Models]** (Rombach, Blattmann, Lorenz, 2022) — 提出在 VAE 潜空间中进行扩散（Stable Diffusion），大幅降低计算成本。https://arxiv.org/abs/2112.10752
- **[Diffusion Models Beat GANs on Image Synthesis]** (Dhariwal, Nichol, 2021) — 通过改进架构和 Classifier Guidance 使扩散模型生成质量首次超越 GAN。https://arxiv.org/abs/2105.05233

### 博文/教程
- **[What are Diffusion Models?]** — Lilian Weng / OpenAI。https://lilianweng.github.io/posts/2021-07-11-diffusion-models/
- **[Stable Diffusion 原理详解]** — Hugging Face Diffusion Course。https://huggingface.co/blog/twigh/Diffusion-Course
- **[扩散模型是如何工作的]** — 李沐 / B站"跟李沐学AI"。https://www.bilibili.com/video/BV1sW4y1J7dL/

### 开源项目
- **[Stable Diffusion WebUI]** — AUTOMATIC1111 开发的功能全面的文生图 GUI。https://github.com/AUTOMATIC1111/stable-diffusion-webui
- **[diffusers]** — Hugging Face 官方扩散模型库，提供预训练 pipeline 和模型。https://github.com/huggingface/diffusers
