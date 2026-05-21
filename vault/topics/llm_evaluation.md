---
id: "llm_evaluation"
name: "LLM评估方法"
name_en: "LLM Evaluation Methods"
type: "topic"
level: 3
area: "engineering"
direction: "eval_quality"
prerequisites: ["basic_prompting"]
difficulty: 3
importance: 5
status: "unknown"
tags: ["evaluation", "llm-judge", "metrics", "human-eval", "evals"]
---

LLM 评估是构建可靠 AI 应用的基础，但也是最难的部分。自动指标（BLEU/ROUGE）无法全面衡量质量，LLM-as-Judge（用 GPT-4 评估其他模型输出）成为新范式，但也存在位置偏差和自我偏好偏差。构建专属评估集是长期维护 LLM 应用质量的关键投资。

## Quiz

### Q1
**问题**: LLM-as-Judge 方法中，"位置偏差"（Position Bias）是指什么问题？

- A. 评估模型偏好特定位置的文档
- B. 当要求 LLM 比较两个回答时，LLM 倾向于认为先出现的（或特定位置的）回答更好，与质量无关  ✓
- C. 评估模型无法处理特定位置的问题类型
- D. 长答案出现在后面时会被忽略

**解析**: 研究发现当要求 LLM 选 A 和 B 哪个更好时，若 A 在前则倾向选 A，若 B 在前则倾向选 B（位置偏差）。还有长度偏差（偏好更长的答案）和自我偏好偏差（GPT-4 倾向于认为 GPT-4 的输出更好）。缓解方法：交换位置重复评估取平均，使用多个 judge 模型，结合人工评估。

### Q2
**问题**: G-Eval 框架相比简单的 LLM-as-Judge 评分的改进是什么？

- A. G-Eval 使用更大的模型进行评估
- B. G-Eval 提供详细的评分维度（连贯性/一致性/流利性/相关性）和标准评分指南（CoT），使评估更结构化  ✓
- C. G-Eval 完全消除了偏差问题
- D. G-Eval 不需要参考答案

**解析**: 简单提示"给这个回答打1-10分"缺乏明确标准。G-Eval（Liu 等，2023）：(1) 定义多个评估维度；(2) 为每个维度提供详细评分说明（像评分量表）；(3) 让 LLM 展示推理过程后再打分（CoT）；(4) 使用 token 概率的加权平均得到连续分数（而非离散整数）。与人类评分的相关性显著提升。

### Q3
**问题**: 构建 LLM 应用的黄金评估数据集（Golden Dataset）时，为什么人工标注的参考答案比 GPT-4 生成的参考答案更可靠？

- A. 人工标注速度更快
- B. GPT-4 生成的参考答案存在系统性偏差（如特定风格偏好），且 GPT-4 评估时会偏好与参考答案风格相近的输出  ✓
- C. 人工标注成本更低
- D. 两者同样可靠，选择取决于预算

**解析**: 若参考答案由 GPT-4 生成，再用 GPT-4 评估，形成自我循环，系统性偏差无法被发现。人工标注（Subject Matter Expert）写的参考答案代表"真正正确"的标准，且专家可以发现 GPT-4 的错误。黄金数据集应覆盖：典型案例、边界案例、已知的失败模式，定期更新以反映新需求。
