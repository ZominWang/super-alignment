---
id: "rlvr"
name: "可验证奖励强化学习"
name_en: "RLVR - Reinforcement Learning with Verifiable Rewards"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["rlhf", "grpo", "reinforcement_learning"]
difficulty: 5
importance: 3
status: "unknown"
tags: ["rlvr", "verifiable-reward", "deepseek-r1", "reasoning", "math", "code"]
---

RLVR（Reinforcement Learning with Verifiable Rewards）是 DeepSeek-R1 训练范式的核心概念，其革命性在于切断了 RL 训练对人类偏好标注的依赖——用可编程验证器（数学表达式的符号计算、代码的单元测试执行、LeetCode 评测器等）提供客观、无噪声的奖励信号，使模型在无人工介入的情况下自主探索出推理能力。RLVR 的两大信号源：(1) 规则奖励——数学答案是否正确、代码 pass 率、格式是否正确；(2) 模型奖励——仅在规则无法覆盖时使用（如通用对齐场景），作为补充而非替代。GRPO 是 RLVR 的训练算法引擎，对每个问题采样 G 个回答，以组内相对奖励（标准化后的 advantage）消除对 Critic 网络的依赖。DeepSeek-R1-Zero 是纯 RLVR 路径的极致实验——跳过 SFT 冷启动，直接在 Base 模型上运行 GRPO，结果自发涌现出反思、验证、回溯等推理行为（"Aha Moment"），证明了这一范式的可行性。R1 完整流程加入冷启动 SFT 数据（精心挑选的数千条高质量思维链样本）作为起点，再经 RLVR → 拒绝采样收集数据 → 再次 SFT → 最终 RLVR，形成四阶段级联。RLVR 与 RLHF 的本质区别：RLHF 的奖励来自人类偏好模型（有偏、昂贵、难以迭代），RLVR 的奖励来自客观标准（确定性强、零标注成本、可无限扩展）。与 DPO 的区别在于 RLVR 是在线 RL——模型在训练中持续生成样本并获取反馈，而非离线学习固定偏好对。

## Quiz

### Q1
**问题**: DeepSeek-R1-Zero 实验的核心发现是什么？这个发现如何改变了 AI 推理研究的范式？

- A. 更大的模型天然具备推理能力，RLVR 只是加速了这个过程
- B. 在没有任何 SFT 思维链数据的情况下，仅通过 RLVR 和结果验证信号（答案正确/错误），模型能自主学会生成长思维链并进行反思和验证——证明复杂推理行为可以从稀疏奖励中涌现 ✓
- C. RLVR 只对数学问题有效，对代码生成没有提升
- D. 纯 RL 训练会导致模型遗忘预训练知识，必须使用 SFT 冷启动

**解析**: R1-Zero 在 DeepSeek-V3-Base 上直接应用 GRPO + 规则奖励（数学验证器），不经任何思维链 SFT 数据。训练过程中观察到：模型的回答从短到长过渡、自发出现"等一等，让我重新检查"等反思语言、学会了多步验证和自我纠错。这是 AI 行为涌现的标志性发现——复杂的元认知行为不需要人工示范，只需要正确的激励结构。这一发现等于宣告：推理能力不是"教"出来的，而是"炼"出来的，只要有可验证目标函数，模型自己会找到路径。

### Q2
**问题**: R1 完整训练流程中，"冷启动 SFT 数据"的作用是什么？为什么 R1-Zero 的纯 RL 路径在最终产品化时需要这一步？

- A. 完全替代 RLVR 阶段，直接用 SFT 达到同样效果
- B. 解决 R1-Zero 输出可读性差（语言混杂、格式混乱）和初期训练不稳定的问题，提供高质量起点加速收敛 ✓
- C. 用于补充 RLVR 无法覆盖的常识知识
- D. 主要为满足监管合规要求，技术上并非必要

**解析**: R1-Zero 虽然涌现了推理能力，但产品化面临两个实际问题：(1) 输出可读性差——模型可能中英文混用、格式不统一、包含无意义的重复，因为 RLVR 只奖励答案正确性而非表达质量；(2) 训练初期冷启动困难——Base 模型对"生成长思维链"毫无概念，RL 初期随机探索效率低。冷启动的数千条高质量思维链样本（人工精选的 CoT 示例）给模型一个"好推理长什么样"的先验，大幅降低了 RL 搜索空间。这反映了一个更普遍的规律：RL 擅长优化已有能力，但不擅长从零发现全新的行为模式——给它一个好的起点，RL 能将其推向极致。

### Q3
**问题**: RLVR 中的"格式奖励"（Format Reward）具体指什么？缺少格式奖励可能导致什么后果？

- A. 强制模型使用特定编程语言，否则输出无效
- B. 检查模型输出是否符合预定义的结构模板（如 <think>推理过程</think> <answer>最终答案</answer>），缺少它将导致推理过程和答案混杂，难以提取和验证 ✓
- C. 要求模型的输出必须带有数学公式的 LaTeX 格式
- D. 限制模型只能生成 JSON 格式的输出

**解析**: 格式奖励是 RLVR 的"元规则"——不评判内容正确性，只检查形式合规性。以 DeepSeek-R1 为例，要求输出包含 <think>...</think>（推理过程）和 <answer>...</answer>（最终答案）。这样做的好处：(1) 验证器能精确提取答案部分进行判分；(2) 推理过程和答案的分离使模型学会"先想清楚再说结论"的模式；(3) 人类读者能清晰看到模型的推理链条。缺少格式奖励时，模型可能把推理和答案揉在一起（"答案是42因为6×7=42"），自动验证器难以可靠提取答案，训练信号被噪声污染。

## 参考资料

### 论文
- **[DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning]** (Guo, Yang, DeepSeek-AI, 2025) — 通过纯 RLVR 在无 SFT 冷启动条件下自发涌现反思/验证推理行为（R1-Zero），四阶段级联训练模板。https://arxiv.org/abs/2501.12948
- **[DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models]** (Shao, Wang, Zhu, DeepSeek-AI, 2024) — DeepSeekMath 的训练方法，含 GRPO 算法和数学推理的 RLVR 应用。https://arxiv.org/abs/2402.03300
- **[DeepSeek-V3 Technical Report]** (DeepSeek-AI, 2024) — DeepSeek-V3 Base 模型的技术报告，DeepSeek-R1 的起始基座。https://arxiv.org/abs/2412.19437
- **[Scaling of Search and Learning: A Roadmap to Reproduce o1 from RL Perspective]** (Zhao, Luo, 2024) — 从 RL 视角分析 o1 类推理模型的训练路线图，讨论 RLVR 的系统性应用。https://arxiv.org/abs/2412.13112
- **[Direct Preference Optimization: Your Language Model is Secretly a Reward Model]** (Rafailov, Sharma, Mitchell, 2023) — DPO 作为离线对齐方法，与 RLVR 的在线 RL 形成对比，帮助理解两者差异。https://arxiv.org/abs/2305.18290

### 视频（B站/YouTube）
- **[DeepSeek-R1 论文解读]** — 李沐 / B站。https://www.bilibili.com/video/BV1c5FGeSEH3/

### 博文/教程
- **[DeepSeek-R1 深度解读]** — DeepSeek 官方博客。https://api-docs.deepseek.com/news/news250120
- **[GRPO 算法详解]** — Hugging Face Blog。https://huggingface.co/blog/open-r1

### 开源项目
- **[Open R1]** — Hugging Face 主导的 DeepSeek-R1 开源复现项目。https://github.com/huggingface/open-r1
- **[verl]** — Volcano Engine 开源的 RLHF/RLVR 训练框架，支持 GRPO。https://github.com/volcengine/verl
