---
id: "red_teaming"
name: "红队测试"
name_en: "Red Teaming"
type: "topic"
level: 3
area: "safety"
direction: "ai_security"
prerequisites: ["prompt_injection"]
difficulty: 4
importance: 2
status: "unknown"
tags: ["safety", "red-teaming", "adversarial", "security-testing"]
---

AI 红队测试通过模拟攻击者视角系统性地发现 LLM 应用的安全漏洞。结构化红队（脚本化攻击场景）和自由形式红队（创意性攻击探索）相结合，自动化红队工具（PyRIT、Garak）可以大规模测试，是 AI 产品上线前的必要安全门控。

## Quiz

### Q1
**问题**: AI 红队与传统软件安全渗透测试（Pen Testing）的主要区别是什么？

- A. AI 红队更关注性能漏洞
- B. AI 红队还需要测试模型行为层面的漏洞（如有害内容生成、价值观偏差），而非只是系统漏洞  ✓
- C. 两者目标完全相同，方法论也相同
- D. AI 红队不需要专业安全背景

**解析**: 传统 Pen Testing 寻找代码漏洞（SQL 注入、XSS、身份验证绕过等）。AI 红队还需要测试：(1) 内容安全（能否诱导生成有害内容）；(2) 提示注入/越狱抵抗；(3) 隐私泄露（能否诱导泄露训练数据）；(4) 偏见和歧视行为；(5) 幻觉和错误信息生成。这需要结合安全专业知识和对 LLM 行为的深度理解。

### Q2
**问题**: "自动化红队（Automated Red Teaming）"工具（如 Garak）如何生成攻击用例？

- A. 手动编写所有攻击场景
- B. 使用预定义的攻击探针库（Probes）对目标模型系统性测试，覆盖各类已知漏洞类型  ✓
- C. 让目标模型自我攻击
- D. 从真实用户投诉中提取攻击模式

**解析**: Garak（Generative AI Red-teaming & Assessment Kit）：预定义探针覆盖越狱、提示注入、有害内容生成、信息提取等类别。测试流程：针对每种攻击类型生成变体，发送给目标模型，用检测器（Detectors）判断攻击是否成功，输出漏洞报告。人工红队聚焦新型创意攻击，自动化工具覆盖已知攻击的全量测试。

### Q3
**问题**: 红队发现漏洞后，"漏洞修复"策略在 AI 系统中为什么比传统软件更复杂？

- A. AI 系统的漏洞无法被修复
- B. 针对特定攻击的修复（如过滤特定关键词）往往不能泛化，修复一个漏洞可能引入新漏洞或降低有用性  ✓
- C. AI 漏洞修复需要更多资金
- D. 只有模型提供商才能修复 AI 漏洞

**解析**: 软件漏洞修复通常是明确的代码修改。AI 安全漏洞的修复选项：(1) 增加护栏（可能误伤合法请求）；(2) RLHF/RLAIF 重新对齐（成本高，且改变了模型全局行为）；(3) 加入攻击样本进行对抗训练（可能导致其他能力下降）。这是为什么 AI 安全需要持续的漏洞追踪和分级响应机制，而非一次性修复。

## 参考资料

### 论文
- **[Red Teaming Language Models to Reduce Harms: Methods, Scaling Behaviors, and Lessons Learned](https://arxiv.org/abs/2209.07858)** (Perez et al., Anthropic, 2022) — 系统介绍 Anthropic 的红队测试方法，包括人工红队和自动化红队的对比，分析了模型规模与攻击成功率的关系。https://arxiv.org/abs/2209.07858
- **[Red Teaming Large Language Models](https://arxiv.org/abs/2202.03286)** (Ganguli et al., Anthropic, 2022) — 描述了对 Claude 早期版本进行大规模人工红队测试的经验，提出了系统性红队流程的最佳实践。https://arxiv.org/abs/2202.03286

### 博文/教程
- **[Microsoft PyRIT: Python Risk Identification Toolkit](https://github.com/Azure/PyRIT)** — Microsoft Azure 官方开源工具。提供自动化 LLM 红队测试的 Python 工具包，支持多种攻击策略和目标模型，是企业级红队实践的重要工具。
- **[Garak: LLM Vulnerability Scanner](https://github.com/NVIDIA/garak)** — NVIDIA 开源的 LLM 安全评估框架，内置数十种攻击探针，覆盖提示注入、越狱、信息提取等常见漏洞类型。
