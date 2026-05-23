---
id: "sft"
name: "指令微调SFT"
name_en: "Supervised Fine-Tuning (SFT)"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["llm_pretraining"]
difficulty: 3
importance: 5
status: "unknown"
tags: ["llm", "fine-tuning", "sft", "instruction-tuning", "chat"]
---

指令微调（SFT）将预训练的语言模型转化为能够遵循人类指令的对话系统。通过高质量的指令-响应对数据集训练，模型学会以用户期望的格式和风格回答问题。SFT 是 ChatGPT 类对话模型的第一个训练阶段。

## Quiz

### Q1
**问题**: 指令微调与继续预训练（Continue Pretraining）的关键区别是什么？

- A. 指令微调使用更大的学习率
- B. 指令微调的训练数据是（指令，响应）对，且通常只对响应部分计算损失  ✓
- C. 指令微调需要更多的训练步骤
- D. 继续预训练不改变模型权重

**解析**: 继续预训练在新领域文本上做语言模型预测（预测下一个词）。指令微调的数据格式是[系统提示]+[用户指令]+[模型响应]，训练时用[指令]部分作为输入，只对[响应]部分的 token 计算交叉熵损失，教模型如何"回答"而非"续写"。

### Q2
**问题**: 高质量指令微调数据集的构建中，"多样性"为什么比"数量"更重要？

- A. 多样性数据更容易标注
- B. 覆盖不同类型指令（推理、写作、代码等）的少量高质量数据，比大量重复场景的低质量数据效果更好  ✓
- C. 数量多会导致过拟合
- D. 多样性数据可以减少计算量

**解析**: LIMA 论文（2023）证明1000条精心挑选的多样化指令数据可以媲美更大规模数据集的效果（"Less Is More for Alignment"）。斯坦福 Alpaca 使用 52K 数据，但后续研究发现多样性是关键因素。这启示了数据飞轮的质量优先原则。

### Q3
**问题**: 聊天模型的"对话模板"（Chat Template）在 SFT 中的作用是什么？

- A. 美化输出格式，使响应更整齐
- B. 为不同角色（system/user/assistant）的文本添加特殊标记，帮助模型区分对话结构  ✓
- C. 限制模型的输出长度
- D. 防止模型生成有害内容

**解析**: 不同模型使用不同对话模板（如 Llama 的 [INST]...[/INST]，ChatML 的 <|im_start|>user 等）。模板将对话历史格式化为模型训练时见过的格式，使模型正确理解角色边界。模板不匹配会导致模型性能大幅下降。

## 参考资料

### 论文
- **[Scaling Instruction-Finetuned Language Models]**(Chung et al., 2022) — FLAN 系列论文，系统研究指令微调对模型规模的缩放效应，FLAN-T5/PaLM。https://arxiv.org/abs/2210.11416
- **[Finetuned Language Models Are Zero-Shot Learners]**(Wei et al., 2022) — FLAN 初始论文，证明指令微调可使语言模型获得零样本任务泛化能力。https://arxiv.org/abs/2109.01652
- **[Self-Instruct: Aligning Language Models with Self-Generated Instructions]**(Wang et al., 2023) — 提出用大模型自身生成指令-响应对来构建 SFT 数据集的方法。https://arxiv.org/abs/2212.10560
