---
id: "data_privacy"
name: "数据隐私"
name_en: "Data Privacy"
type: "topic"
level: 3
area: "safety"
direction: "governance"
prerequisites: ["ai_safety_basics"]
difficulty: 2
importance: 2
status: "unknown"
tags: ["governance", "privacy", "gdpr", "pii", "data-protection"]
---

LLM 的数据隐私涉及训练数据隐私（模型可能记忆并泄露训练中的个人信息）和推理时隐私（用户输入的敏感信息发送给 API）。GDPR 的"被遗忘权"对 LLM 提出了独特挑战，差分隐私和机器遗忘（Machine Unlearning）是技术解决方案。

## Quiz

### Q1
**问题**: LLM 的"训练数据记忆（Memorization）"是什么安全风险？

- A. 模型占用过多 GPU 内存
- B. LLM 可能记住并在推理时泄露训练数据中的个人信息（如电话号码、邮件地址、私密内容）  ✓
- C. 模型记住训练集导致过拟合
- D. 训练数据被攻击者盗取

**解析**: Carlini 等研究表明，可以通过特定提示让 GPT-2 等模型复现训练集中的个人身份信息（PII）。去重和数量出现超过一定次数的训练数据记忆率显著更高。这是 GDPR 合规的挑战：若用户个人数据用于训练，即使不在训练集中，也可能通过"成员推断攻击"判断某数据是否参与训练。

### Q2
**问题**: 在使用第三方 LLM API（如 OpenAI）处理企业敏感数据时，哪些技术措施可以降低隐私风险？

- A. 只使用少于 100 字的提示词
- B. 数据脱敏/匿名化（发送前去除 PII）、使用企业级 API（数据不用于训练）、数据驻留在特定区域的部署  ✓
- C. 使用更便宜的 API 套餐
- D. 只在工作时间调用 API

**解析**: 实践措施：(1) 发送前对 PII 进行正则或 NER 检测并替换（"张三"→"用户A"）；(2) 使用 Azure OpenAI 或企业版 API（数据不用于训练，数据驻留在指定区域）；(3) 自托管开源模型（完全控制数据流）；(4) 将敏感推理在私有环境完成（只用公有 API 处理非敏感任务）。

### Q3
**问题**: GDPR 的"被遗忘权（Right to Erasure）"对 LLM 系统提出了什么独特挑战？

- A. 用户可以要求删除对话历史，这很容易实现
- B. 若 LLM 训练数据包含用户个人信息，删除训练数据并不能保证模型"遗忘"，可能需要代价高昂的机器遗忘技术  ✓
- C. GDPR 明确豁免了 AI 训练数据
- D. 只需删除数据库中的用户记录即可满足要求

**解析**: 传统软件删除数据库记录即可。LLM 困难：个人信息已被"消化"进模型权重，无法直接删除。选项：(1) 重新训练不含该数据的模型（极其昂贵）；(2) 机器遗忘算法（通过梯度更新删除特定知识，但效果不稳定）；(3) 从根本上不用含 PII 的数据训练（数据治理最佳实践）。这是 LLM 合规的最难挑战之一。

## 参考资料

### 论文
- **[The Algorithmic Foundations of Differential Privacy](https://www.cis.upenn.edu/~aaronroth/privacybook.pdf)** (Dwork & Roth, 2014) — 差分隐私理论的权威教材，系统定义了 (ε, δ)-DP 及核心机制（高斯、Laplace 噪声），是理解差分隐私数学基础的必读文献。
- **[Quantifying Memorization Across Neural Language Models](https://arxiv.org/abs/2202.07646)** (Carlini et al., 2022) — 系统量化了不同规模 LLM 中的训练数据记忆程度，证明模型越大记忆率越高，对数据隐私合规研究有直接指导意义。https://arxiv.org/abs/2202.07646

### 博文/教程
- **[GDPR Official Text](https://gdpr-info.eu/)** — gdpr-info.eu 整理的 GDPR 全文及逐条注释，包含"被遗忘权"（第17条）、自动化决策（第22条）等与 AI 最相关的条款，提供英文注释版本。
