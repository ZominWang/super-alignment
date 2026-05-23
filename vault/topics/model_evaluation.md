---
id: "model_evaluation"
name: "模型评估与调优"
name_en: "Model Evaluation & Tuning"
type: "topic"
level: 3
area: "foundations"
direction: "ml"
prerequisites: ["supervised_learning"]
difficulty: 2
importance: 4
status: "unknown"
tags: ["ml", "evaluation", "cross-validation", "hyperparameter"]
---

模型评估与调优是机器学习工程实践的核心环节。正确的评估流程（训练/验证/测试集划分、交叉验证）防止数据泄露，ROC-AUC、F1 等指标针对不同问题场景的选择，以及超参数调优策略，是将模型从实验推向生产的关键技能。

## Quiz

### Q1
**问题**: 为什么在超参数调优时，不能用测试集来选择最优超参数？

- A. 测试集太小，统计检验不可靠
- B. 在测试集上选择超参数会导致信息泄露，使测试集性能高估真实泛化能力  ✓
- C. 超参数调优只能用训练集
- D. 这只是惯例，实际上用测试集选超参数也可以

**解析**: 若用测试集选超参数，模型实际上已经"看到"测试集，此时测试集性能不再是对未知数据的无偏估计。应用验证集（或交叉验证）选超参数，测试集只在最终报告性能时使用一次。

### Q2
**问题**: 在类别严重不平衡（99% 负样本，1% 正样本）的二分类问题中，哪个指标最不适合单独使用？

- A. AUC-ROC
- B. F1 分数
- C. 准确率（Accuracy）  ✓
- D. 精确率-召回率曲线下面积（PR-AUC）

**解析**: 类别不平衡时，全预测为负样本就能得到 99% 的准确率，但模型完全没用。AUC-ROC、F1 和 PR-AUC 更好地衡量模型对正样本的识别能力。PR-AUC 在极端不平衡时优于 AUC-ROC。

### Q3
**问题**: k 折交叉验证（k-fold Cross Validation）与留出法（Hold-out）相比，主要优势是？

- A. 计算速度更快
- B. 充分利用数据，每个样本都被用于验证，得到更稳定的性能估计  ✓
- C. 完全避免数据泄露
- D. k 折交叉验证可以并行化

**解析**: k 折 CV 将数据分为 k 个子集，每次以一份为验证集、其余为训练集，重复 k 次取平均。相比留出法，k 折 CV 的评估方差更小，更充分利用有限数据，特别适合小数据集场景。

## 参考资料

### 论文
- **[BLEU: a Method for Automatic Evaluation of Machine Translation]** (Papineni et al., 2002) — 提出 BLEU 指标，通过 n-gram 精确率衡量机器翻译质量，是自然语言生成评估指标的奠基性工作。https://aclanthology.org/P02-1040/
- **[BERTScore: Evaluating Text Generation with BERT]** (Zhang et al., 2020) — 提出 BERTScore，利用预训练模型的上下文嵌入计算语义相似度，显著提升文本评估与人类判断的相关性。https://arxiv.org/abs/1904.09675

### 博文/教程
- **[A Survey on Evaluation of Large Language Models]** (Chang et al., 2023) — 系统综述 LLM 评估的任务类型、评估指标与方法，涵盖知识、推理、安全性等多维度评估框架，适合全面了解 LLM 评估体系。https://arxiv.org/abs/2307.03109
