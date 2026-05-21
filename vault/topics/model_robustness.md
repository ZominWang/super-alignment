---
id: "model_robustness"
name: "模型鲁棒性"
name_en: "Model Robustness"
type: "topic"
level: 3
area: "safety"
direction: "ai_security"
prerequisites: ["ai_safety_basics"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["safety", "robustness", "adversarial-examples", "distribution-shift"]
---

模型鲁棒性衡量模型在分布偏移、对抗性输入和边界条件下的稳定性。LLM 对输入的微小改变（如换同义词、改变提问顺序）可能产生截然不同的输出，理解并提升鲁棒性是构建可靠 AI 系统的基础。

## Quiz

### Q1
**问题**: LLM 的"过度敏感性（Over-sensitivity）"和"过度稳定性（Under-sensitivity）"各指什么问题？

- A. 两者都指模型对输入变化过度反应
- B. 过度敏感是对语义相同但措辞不同的输入给出不一致答案；过度稳定是对语义不同但表面相似的输入给出相同错误答案  ✓
- C. 过度敏感只存在于多语言场景
- D. 两者都可以通过增加训练数据解决

**解析**: 过度敏感（Brittle）："明天天气好吗" 和 "明天天气怎样" 得到截然不同的回答，影响一致性体验。过度稳定（Robust to perturbation but wrong）：对所有类似的问题（包括语义不同的）都给出相同错误答案，表面看起来一致但结论是错的。两者都是鲁棒性问题，方向相反。

### Q2
**问题**: "分布偏移（Distribution Shift）"在 LLM 应用中如何表现？

- A. 训练数据格式与推理时的输入格式不一致，导致性能下降  ✓
- B. 模型参数在部署后随时间变化
- C. 不同地区用户的硬件差异导致输出不同
- D. 分布偏移只影响分类模型，不影响生成模型

**解析**: 分布偏移表现：(1) 领域偏移（在通用文本训练，用于专业医疗问答）；(2) 风格偏移（微调时用正式文本，生产中遇到口语化输入）；(3) 语言偏移（主要用英文训练，服务中文用户）；(4) 时间偏移（训练数据有截止日期，新事件、新术语不在分布内）。持续监控生产分布与训练分布的差异是 MLOps 的重要任务。

### Q3
**问题**: "对抗性提示鲁棒性"评估方法中，CheckList 框架的核心思想是什么？

- A. 使用尽可能多的测试用例覆盖所有场景
- B. 通过设计特定类型的能力测试（MFT/INV/DIR）系统验证模型在各种扰动下的行为一致性  ✓
- C. 让对抗者和模型进行博弈
- D. 使用最先进的攻击算法测试模型

**解析**: CheckList（Ribeiro 等，2020）的三类测试：(1) MFT（Minimum Functionality Test）：在简单情况下模型是否有基本能力；(2) INV（Invariance Test）：语义不变的改写是否给出一致结果（如换同义词、变换句式）；(3) DIR（Directional Expectation Test）：语义变化后结果是否按预期方向变化。这个框架的思想已被扩展到 LLM 评估中。
