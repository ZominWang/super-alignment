---
id: "diffusion_language_models"
name: "扩散语言模型"
name_en: "Diffusion Language Models"
type: "topic"
level: 3
area: "llm"
direction: "llm_arch"
prerequisites: ["transformer_arch", "tokenization"]
difficulty: 5
importance: 2
status: "unknown"
tags: ["diffusion", "language-model", "d3pm", "text-diffusion", "non-autoregressive"]
---

扩散语言模型将图像扩散模型的思想引入文本生成，旨在突破自回归模型"逐 token 串行生成"的速度瓶颈，实现并行化生成。核心技术路线分两条：离散扩散（D3PM）将前向过程定义为在离散词表上的转移矩阵（如均匀转移或掩码转移），通过"随机翻转 token"模拟加噪，反向过程学习预测原始 token 或去噪掩码；连续扩散（Diffusion-LM）先将离散文本嵌入到连续空间，在嵌入空间进行高斯扩散，解码时通过"rounding"将连续向量映射回离散 token。掩码扩散（MDLM/Genie）是最新进展，将生成建模为逐步揭露被遮盖 token 的过程（吸收态扩散），在可控生成和文本补全上展现出竞争力。扩散语言模型的独特优势在于非自回归的并行解码、天然适合填空和补全任务，以及通过控制扩散条件实现属性导向生成。但目前扩散语言模型在生成质量、困惑度（PPL）和文本流畅度上仍显著劣于自回归模型，且扩散步骤数远多于自回归模型的总 token 数，推理速度优势存疑。该方向目前处于学术探索期，尚未出现像 Stable Diffusion 在图像领域那样的标杆应用。关键论文：Austin et al. 2021 "D3PM", Li et al. 2022 "Diffusion-LM", Lou et al. 2024 "Discrete Diffusion Modeling by Estimating the Ratios of the Data Distribution"。

## Quiz

### Q1
**问题**: D3PM（Discrete Denoising Diffusion Probabilistic Models）中"加噪"操作的本质是什么？

- A. 在连续空间添加高斯噪声
- B. 根据预定义的离散转移矩阵，以一定概率将每个 token 替换为其他 token（包括 [MASK]），逐步破坏原文 ✓
- C. 随机删除文本中的 token
- D. 用 GAN 生成器伪造文本来作为"噪声"

**解析**: D3PM 的离散扩散通过转移概率矩阵 Q_t 来定义前向过程 q(x_t|x_{t-1}) = Cat(x_t; x_{t-1}·Q_t)。Q_t 可设计为：(a) 均匀转移——每个 token 等概率变为任意其他 token；(b) 掩码转移——只允许变为 [MASK]，类似 MLM 的逐步挖掘；(c) 吸收态——token 一旦变为 [MASK] 就保持。掩码转移已被证明效果最好且与 BERT 的 MLM 在理论上紧密联系。

### Q2
**问题**: 扩散语言模型相比自回归语言模型的潜在优势是什么（理论上）？

- A. 扩散模型的参数量更少
- B. 非自回归的并行生成，天然适合填空、补全等双向任务，且可通过条件控制扩散方向 ✓
- C. 扩散模型能处理比自回归模型更长的序列
- D. 扩散模型不需要位置编码

**解析**: 自回归生成（GPT 方向）必须从左到右逐个 token 串行，无法利用后文约束前文；扩散模型从整体噪声出发逐步去噪，所有 token 同时更新，天然适合"给定前后文补中间"的填空场景。此外，通过在扩散的每个时间步注入控制条件（如情感标签、风格属性），可实现比自回归模型更灵活的生成控制。但理论优势尚未在实践中完全兑现。

### Q3
**问题**: 为什么扩散语言模型至今未能像扩散图像模型那样成为主流？

- A. 文本是离散的，无法直接应用高斯噪声扩散，离散/连续转换带来信息损失和建模困难；且文本的局部结构敏感，微小扰动就可能变为无意义序列 ✓
- B. 扩散语言模型的训练速度太慢
- C. 缺乏合适的 Transformer 架构
- D. 扩散语言模型无法使用 GPU 加速

**解析**: 核心难点：(1) 离散性是根本矛盾——图像在连续像素空间自然兼容高斯扩散，文本的 token 是离散符号，离散扩散缺乏与高斯扩散同样优雅的数学框架；(2) 误差累积——Diffusion-LM 的"先嵌入扩散再 rounding 回 token"在 rounding 步骤引入不可逆误差，生成文本易出现重复和语法错误；(3) 步骤效率——自回归模型 gen N tokens = N steps，扩散模型 gen N tokens = 1000+ steps；(4) 质量差距——当前最强的掩码扩散模型（MDLM）困惑度仍比同参数自回归模型高 10+ PPL 点。这些使得 DLM 距实用化仍有距离。

## 参考资料

### 论文
- **[Structured Denoising Diffusion Models in Discrete State-Spaces (D3PM)]** (Austin et al., 2021) — 提出离散状态空间扩散框架 D3PM，定义了均匀转移、掩码转移等多种前向过程，奠定离散扩散语言模型的理论基础。https://arxiv.org/abs/2107.03006
- **[Diffusion-LM Improves Controllable Text Generation]** (Li et al., 2022) — 将文本嵌入到连续空间再施加高斯扩散，首次在文本生成上实现细粒度属性控制。https://arxiv.org/abs/2205.14217
- **[Simplified and Generalized Masked Diffusion for Discrete Data (MDLM)]** (Shi et al., 2024) — 提出掩码扩散语言模型，统一了 BERT 式掩码语言模型与扩散模型，在困惑度和生成质量上取得当时最佳。https://arxiv.org/abs/2406.04329
