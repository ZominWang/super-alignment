---
id: "synthetic_data_generation"
name: "合成数据生成"
name_en: "Synthetic Data Generation"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["sft", "basic_prompting"]
difficulty: 3
importance: 4
status: "unknown"
tags: ["synthetic-data", "data-augmentation", "self-instruct", "evol-instruct", "distillation"]
---

合成数据生成已成为 LLM 训练（尤其是指令微调阶段）的主流数据获取方式，其核心思想用强 LLM 生成训练数据来训练目标模型。代表性范式：Self-Instruct 以少量人工种子指令启动，引导 LLM 反复生成新指令并自我筛选有效样本，构建庞大指令数据集；Evol-Instruct（WizardLM）在此基础上引入渐进式复杂度演化——将简单指令经过"深度扩展、广度延伸"等操作迭代升级为复杂指令，再让 LLM 生成对应回答，产出覆盖全难度梯度的训练数据。从强模型蒸馏训练数据（如用 GPT-4 生成数据训练 Phi-2、用 GPT-4 输出训练 Claude、用 Claude 输出训练 Llama-variant）已成为行业默认做法。关键挑战包括：质量控制（根据回答长度、格式、一致性自动评分过滤）、数据多样性防退化（防止生成同质数据导致模型过拟合特定分布）、以及"模型坍塌"（Model Collapse）——当生成的合成数据被重复用于训练时，模型逐渐遗忘长尾分布，生成质量螺旋下降。Phi 系列（Textbooks Are All You Need）实践了"用教科书质量的合成数据训练小模型"的极端路线。关键论文：Wang et al. 2023 "Self-Instruct", Xu et al. 2023 "WizardLM", Gunasekar et al. 2023 "Textbooks Are All You Need"。

## Quiz

### Q1
**问题**: Self-Instruct 如何从少量种子数据扩增到大规模指令集？

- A. 通过人工标注逐步增加指令
- B. 使用 LLM 循环批处理式生指令：每轮用当前池中的指令在上下文示例，要求 LLM 生成新的多样化指令，再让同一 LLM 生成回答，用规则/LLM 评判进行过滤 ✓
- C. 用搜索引擎自动抓取指令数据
- D. 用随机篡改已有指令

**解析**: Self-Instruct 的管道：(1) 从 175 条人工种子指令开始；(2) 每轮从指令池随机采样 8 条（6 条人工 + 2 条 AI 生成）作为 few-shot 示例；(3) 要求 LLM 生成 20 条新指令；(4) 指令分类过滤（避免重复和不合规）；(5) 对每个指令用 LLM 生成回答（输入-输出方式或输出-输入方式）；(6) 质量过滤（ROUGE 相似度过低、回答过长过短等丢弃）。多次迭代后，175→52K 指令。核心在于"自举"：随着池子变丰富，生成质量也提升。

### Q2
**问题**: Evol-Instruct 的"指令演化"操作具体指什么？

- A. 直接将英文指令翻译成中文
- B. 通过提示要求 LLM 对一条指令执行"深度增加"（加约束、加步骤、加难度）或"广度扩展"（引入新主题、新角度），再对演化后的指令生成答案 ✓
- C. 使用强化学习训练指令生成器
- D. 手动编写覆盖各难度等级的指令

**解析**: Evol-Instruct 分两个阶段：(A) 指令演化器——给定一条"种子指令"，用 In-Depth Evolving 提示（"请增加这个问题的复杂度，添加更多约束条件/推理步骤/领域知识要求"）或 In-Breadth Evolving 提示（"请创建一个不同主题但难度相当的新指令"）让 LLM 改写；(B) 答案生成——对演化后的指令生成高质量答案。通过多轮演化，原始简单指令如"写一首诗"会变成"写一首十四行诗，表达对科技进步的矛盾情感，引用莎士比亚风格，不使用明确提及科技的词"。WizardLM 由此产出了覆盖全难度的 Alpaca-style 训练集。

### Q3
**问题**: "模型坍塌"（Model Collapse）现象在合成数据场景中是如何发生的？

- A. 模型参数数量随着训练增多而减少
- B. 当模型在自己（或同类模型）生成的合成数据上迭代训练时，每一代都会丢失数据分布的长尾信息——稀有模式被遗忘，生成的多样性不断降低，最终输出同质化、平庸化的内容 ✓
- C. 模型因为训练数据过多而发生过拟合
- D. 训练过程中 GPU 显存不足导致模型参数被截断

**解析**: 数学上，设原始分布为 P，第一代模型 g₁ 拟合了 P；第二代用 g₁ 生成的数据训练 g₂，相当于在用 g₁ 近似 P 的近似上再近似，每一步引入更多估计误差。这导致"分布坍缩"：高频模式被加强，长尾的低频模式（罕见知识、特殊风格、边缘观点）被逐渐"平均"掉。极端情况是多代后模型只能生成高度重复的、缺乏信息量的文本。解决方案：始终保留一定比例的人类数据、使用多源数据混合、对合成数据进行多样性增强。

## 参考资料

### 论文
- **[Self-Instruct: Aligning Language Models with Self-Generated Instructions]** (Wang et al., 2023) — 提出 Self-Instruct 框架，以 175 条种子指令自举生成 52K 指令数据集，奠定了合成指令数据生成的基础范式。https://arxiv.org/abs/2212.10560
- **[WizardLM: Empowering Large Language Models to Follow Complex Instructions]** (Xu et al., 2023) — 提出 Evol-Instruct，通过渐进式复杂度演化生成覆盖全难度梯度的指令数据，显著提升模型遵循复杂指令的能力。https://arxiv.org/abs/2304.12244
- **[Textbooks Are All You Need]** (Gunasekar et al., 2023) — 介绍 Phi-1 的训练方法，用教科书质量的合成数据训练 1.3B 小模型，挑战了"大模型才有大能力"的惯性认知。https://arxiv.org/abs/2306.11644
