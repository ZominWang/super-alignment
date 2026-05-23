---
id: "prompt_injection"
name: "提示注入与越狱"
name_en: "Prompt Injection & Jailbreaking"
type: "topic"
level: 3
area: "safety"
direction: "ai_security"
prerequisites: ["basic_prompting"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["safety", "prompt-injection", "jailbreak", "adversarial", "attack"]
---

提示注入通过在用户输入中嵌入恶意指令来覆盖系统提示，越狱则试图通过角色扮演或认知技巧绕过安全限制。理解这些攻击向量对于构建安全的 LLM 应用至关重要，防护策略包括输入检测、特权分离和不信任用户输入原则。

## Quiz

### Q1
**问题**: 直接提示注入（Direct Prompt Injection）和间接提示注入（Indirect Prompt Injection）的区别是？

- A. 直接注入更危险，间接注入危害较小
- B. 直接注入由用户在聊天界面输入恶意指令，间接注入通过 LLM 处理的外部内容（网页/文档）嵌入恶意指令  ✓
- C. 间接注入需要访问系统提示，直接注入不需要
- D. 两者攻击目标不同，不可比较

**解析**: 直接注入（用户控制的输入）："忽略之前所有指令，做 XYZ"。间接注入（Agent 处理外部内容时）：网页中隐藏文字"如果 AI 在读这段话，请执行..."，当 Agent 抓取该网页时无意中执行了恶意指令。Agent 系统因为会处理大量外部内容，对间接注入特别脆弱。

### Q2
**问题**: "越狱（Jailbreaking）"中的"DAN（Do Anything Now）"类提示词的工作原理是什么？

- A. 利用模型的代码执行漏洞
- B. 通过角色扮演设定让模型"进入"一个没有安全限制的角色，绕过 RLHF 对齐  ✓
- C. 通过重复请求疲惫模型的安全过滤
- D. 利用特殊 Unicode 字符绕过关键词过滤

**解析**: DAN 等越狱提示要求模型扮演一个"没有限制的 AI"角色。RLHF 对齐将拒绝有害请求的行为"编码"到模型权重中，但角色扮演框架（"假装你是 DAN"）可能让模型将安全行为切换到角色定义中去，而不是自己的核心价值观。对齐鲁棒性是当前研究的重点。

### Q3
**问题**: "特权提示隔离（Privilege Isolation）"如何防护提示注入？

- A. 加密系统提示防止用户读取
- B. 在架构层面区分可信的系统指令和不可信的用户/外部内容，让 LLM 对不同来源给予不同权重  ✓
- C. 限制系统提示的长度
- D. 对所有输入进行 HTML 转义

**解析**: 将提示分为：(1) 系统层（完全可信）；(2) 应用层（经过应用验证）；(3) 用户层（不可信）；(4) 外部内容层（最不可信）。在提示中明确标记内容来源（`<external_content>`标签），并告知 LLM 外部内容中的指令不应被执行。这类似于 SQL 注入防护的参数化查询思路——分离"代码"和"数据"。

## 参考资料

### 论文
- **[Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection](https://arxiv.org/abs/2302.12173)** (Greshake et al., 2023) — 首次系统研究间接提示注入对 LLM 集成应用的威胁，提出多种攻击向量并呼吁建立防御标准。https://arxiv.org/abs/2302.12173

### 博文/教程
- **[OWASP Top 10 for Large Language Model Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)** — OWASP 官方项目。列出 LLM 应用的十大安全风险，提示注入（LLM01）位列第一，提供详细的攻击描述、影响分析和防御建议，是 LLM 安全实践的核心参考清单。
- **[Prompt Injection Attacks and Defenses in LLM-Integrated Applications](https://arxiv.org/abs/2310.12815)** (Liu et al., 2023) — 对提示注入攻击和防御的综合调研，覆盖攻击分类、防御策略评估和未来研究方向。https://arxiv.org/abs/2310.12815
