---
id: membership_inference
name: 成员推断与隐私攻击
name_en: Membership Inference and Privacy Attacks
type: topic
level: 3
area: safety
direction: ai_security
prerequisites:
  - data_privacy
  - ai_safety_basics
difficulty: 4
importance: 2
status: unknown
tags:
  - membership-inference
  - privacy
  - data-leakage
  - training-data
  - differential-privacy
---

成员推断攻击（Membership Inference Attack, MIA）是机器学习隐私安全领域的核心研究方向，旨在判断特定数据点是否被用于训练目标模型。其攻击原理基于一个关键观察：模型对训练过的数据通常表现出更高的置信度或更低的损失值。从 Shokri 的 Shadow Model 方法到 Carlini 的 LiRA（似然比攻击），攻击技术在低假阳率下的检测精度持续提升。在 LLM 时代，困惑度分析、邻域分析和金丝雀记忆测试成为评估模型隐私泄露风险的重要手段，而差分隐私和训练数据去重则是最关键的防御策略。

# 成员推断与隐私攻击

## 核心定义

成员推断攻击（Membership Inference Attack, MIA）旨在判断某个特定数据点是否被用于训练目标模型。这看似简单的问题，其答案却泄露了最根本的隐私信息——某人/某数据是否在训练集中。医疗诊断数据、金融记录、私密对话等一旦被确认出现在训练数据中，本身就构成隐私侵犯。

### 威胁模型

以分类模型为例：攻击者拥有目标模型的查询权限（黑盒，可得模型在任意输入上的输出概率向量），目标是判断某个给定的 $(x, y)$ 数据点是否属于训练集。

## 攻击原理

成员推断攻击依赖一个核心观察：**机器学习模型通常对训练过的数据表现出更高的置信度或更低的损失值**。模型在训练过程中对见过的数据“拟合得更好”——输出概率更集中、loss 更低、困惑度（perplexity）更小。攻击者利用这种行为差异来判断成员身份。

### Shokri et al. (2017) 的 Shadow Model 方法

这是最具影响力的成员推断攻击方法：

1. **训练 Shadow Models**：攻击者使用与目标模型相同或相似的架构，在自有的“影子数据集”上训练多个影子模型（shadow models）。这些影子模型模拟目标模型的行为，但攻击者完全知道其训练集成员身份。

2. **构建 Attack Model**：对于影子模型，攻击者知道哪些数据在训练集中，哪些不在。收集影子模型在这些“已知成员”和“已知非成员”数据上的输出（如预测概率向量、top-k 概率、loss 值、熵等），训练一个二分类攻击模型——输入是目标模型的输出行为，输出是“是否在训练集中”的判断。

3. **攻击目标模型**：用训练好的攻击模型去推断目标模型上的数据成员身份。

Shadow Model 方法的优雅之处在于：它只需要黑盒访问目标模型，攻击者甚至不需要知道目标模型的具体架构。

### Likelihood Ratio Attack (LiRA)

LiRA（Likelihood Ratio Attack, Carlini et al. 2022）是目前最强的成员推断方法之一。它不需要训练多个影子模型，而是训练一个影子模型，然后计算目标数据点在该影子模型下的 loss，并在多个“相同分布但不同采样的影子模型”上获得 loss 的经验分布。最后通过似然比检验（Likelihood Ratio Test）来判断目标数据点是成员（低 loss）还是非成员（高 loss）。

LiRA 的 TPR（True Positive Rate）在低 FPR（False Positive Rate，如 0.1%）下显著优于传统方法，使之成为评估差分隐私等防御措施有效性的标准工具。

## 针对 LLM 的成员推断

LLM 为成员推断带来了新的攻击面和方法：

### 基于困惑度的攻击
LLM 的 perplexity（困惑度）天然是成员推断信号：训练数据中的文本序列在模型下通常有更低的困惑度。计算候选文本的 perplexity，设置阈值区分成员和非成员。但这种方法在短文本上可靠性较低。

### Neighborhood Analysis
不只关注目标文本本身的困惑度，还考察其“邻居文本”（neighboring texts）的困惑度。如果目标文本的困惑度显著低于其少量修改后的版本（如同义词替换），则更可能是训练集成员。这一技术提高了对短文本成员推断的准确性。

### Canary Memorization 测试
在训练前，向训练数据中注入“金丝雀”（canary）——随机生成但不自然出现的唯一字符串序列（如 “The quick brown foxtrot jumps over the lazy programmer”）。训练完成后，测试模型是否能复现这些金丝雀。如果能完整复现，说明模型有严重的记忆（memorization）倾向。大模型越大（参数越多）、数据重复度越高、去重越不充分，金丝雀记忆率越高。这是衡量 LLM 隐私泄露风险的标准化方法。

## 防御

### 差分隐私 (Differential Privacy, DP)
差分隐私是当前最强的理论保障。核心思想：在训练过程中注入受控的随机噪声，使训练过程的输出（模型参数）对单个训练样本不敏感。形式上，一个随机算法 $\mathcal{M}$ 满足 $(\epsilon, \delta)$-差分隐私，当且仅当对所有相邻数据集 $D$ 和 $D'$（仅差一个样本）：

$$P[\mathcal{M}(D) \in S] \leq e^\epsilon \cdot P[\mathcal{M}(D') \in S] + \delta$$

其中 $\epsilon$ 越小，隐私保护越强但模型性能损失越大。实践中常用 DP-SGD（Abadi et al. 2016）：在随机梯度下降中对梯度进行裁剪（clipping）并添加高斯噪声。差分隐私理论上可严格防御成员推断攻击，但在大模型上，要达到有意义的 $\epsilon$ 往往需要付出显著的性能代价。

### 训练数据去重
大量研究证明，训练数据中的重复样本是记忆的主要来源。通过严格的近重复去重（near-deduplication），可以显著降低模型的记忆率和成员推断成功率。但完全去重可能影响模型在重复模式上的学习能力。

### 模型遗忘 (Machine Unlearning)
模型遗忘技术旨在从已训练好的模型中“抹除”特定训练数据点的影响。SISA（Sharded, Isolated, Sliced, Aggregated）训练策略将数据分片、训练多个子模型，需要遗忘时将相关子模型重新训练。但对于 LLM 这样训练成本极高的模型，精确遗忘（exact unlearning）几乎是不可行的，近似遗忘（approximate unlearning）是一个活跃的研究方向。

## MIA 的法律与监管意义

成员推断攻击的法律意义日益凸显。GDPR 赋予个体“被遗忘权”（Right to be Forgotten），而 MIA 的力量——即能证明模型“记住”了某人数据——正是此权利的技术基础。如果 MIA 能高置信度地证明某数据在训练集中，而模型所有者又没有合法处理基础，将面临严重的合规风险。在实践中，监管机构也越来越多地使用 MIA 作为审计 AI 系统隐私保护水平的工具。

## Quiz

**Q1: 成员推断攻击 (MIA) 所依赖的核心观察是什么？**

A. 模型对所有输入都有相同的行为
B. 模型对训练过的数据通常有更高置信度/更低损失 ✓
C. 模型只能对训练数据做出正确分类
D. 模型无法处理未见过的数据

**解析**：B 正确。MIA 的核心前提是模型在训练数据上拟合更好，表现为更高置信度、更低 loss。A 错误，如果模型对所有输入行为相同则无法区分；C 错误，模型也能对未见数据做出正确分类（泛化能力）；D 错误，模型的核心价值就在于泛化到未见数据。

**Q2: LiRA (Likelihood Ratio Attack) 相比传统 Shadow Model 方法的主要优势是什么？**

A. 完全不需要访问目标模型
B. 在低假阳率下的真阳率显著更优 ✓
C. 只能攻击线性模型
D. 需要训练比 Shadow Model 更多的影子模型

**解析**：B 正确。LiRA 通过似然比检验，在低 FPR（如 0.1%）场景下取得远高于传统 Shadow Model 方法的 TPR，使其更适合评估差分隐私等对 FPR 有严格要求的防御措施的有效性。A 错误，LiRA 仍需黑盒访问；C 错误，LiRA 是通用方法；D 错误，LiRA 通常只需要一个或少数影子模型。

**Q3: Canary Memorization 测试中“金丝雀”必须满足什么条件？**

A. 必须是真实存在的、常见的数据记录
B. 必须是随机生成、在自然数据中不会出现的唯一字符串 ✓
C. 必须是与训练数据中某条记录完全相同的文本
D. 必须是模型开发者不知道的文本

**解析**：B 正确。金丝雀必须是随机生成的唯一字符串，在自然语料中几乎不可能出现。这样，如果模型在训练后能复现金丝雀，就可以排除”这些字符串本来就被模型从预训练数据中学到了”的可能，从而明确推断为对训练数据的记忆。A 错误，常见字符串无法排除”预训练已存在”的可能；C 错误，相同文本无法区分记忆与巧合；D 错误，金丝雀由研究者主动注入，当然知道其内容。

## 参考资料

### 论文
- **[Membership Inference Attacks Against Machine Learning Models](https://arxiv.org/abs/1610.05820)** (Shokri et al., 2017) — 成员推断攻击的奠基性论文，提出 Shadow Model 方法，首次系统证明可以通过黑盒访问判断样本是否在训练集中。https://arxiv.org/abs/1610.05820
- **[Membership Inference Attacks From First Principles](https://arxiv.org/abs/2112.03570)** (Carlini et al., 2022) — 提出 LiRA（似然比攻击），在低假阳率下达到最优攻击精度，成为评估差分隐私防御有效性的标准工具。https://arxiv.org/abs/2112.03570

### 博文/教程
- **[ML Privacy Meter](https://github.com/privacytrustlab/ml_privacy_meter)** — GitHub 开源工具。提供量化 ML 模型隐私泄露风险的实用工具，支持成员推断攻击评估和差分隐私审计，是隐私安全从业者的重要工程资源。
