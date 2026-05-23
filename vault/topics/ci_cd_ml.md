---
id: ci_cd_ml
name: ML持续集成与交付
name_en: ML CI/CD and MLOps Pipelines
type: topic
level: 3
area: engineering
direction: mlops
prerequisites:
  - containerization
  - model_evaluation
difficulty: 3
importance: 2
status: unknown
tags:
  - ci-cd
  - mlops
  - pipeline
  - automation
  - deployment
---

ML CI/CD 与传统软件 CI/CD 有本质区别，需要同时管理代码、数据和模型三大可变要素的耦合关系。持续训练（Continuous Training）是其核心环节，通过数据漂移检测、定时或性能触发等机制自动启动重训练，并经由离线评估、A/B 测试等验证门控确保新模型质量达标方可部署。Canary、Blue-Green 和 Shadow 等多种部署策略为不同风险偏好的模型发布提供了灵活选择。针对 LLM 应用，提示变更管理和无确定性输出的测试策略带来了全新挑战，需要提示版本控制、语义等价断言和统计测试等特殊手段来保障管道可靠性。

# ML 持续集成与交付 (ML CI/CD)

## ML CI/CD 与软件 CI/CD 的核心差异

传统软件 CI/CD 只需管理**代码**单一要素的版本。ML 系统的 CI/CD 需要同时管理三大可变化要素：

| 要素 | 传统软件 | ML 系统 |
|------|---------|---------|
| 代码 | 是变更来源 | 是变更来源 |
| 数据 | 不相关 | Schema 漂移、分布漂移、标签质量变化 |
| 模型/配置 | 不相关 | 超参数、架构、随机种子、训练策略 |

这三要素相互耦合：数据变更触发重新训练，模型架构变更影响推理性能，代码变更影响训练和推理逻辑。ML CI/CD 管道的设计目标就是自动化管理这个三元组的生命周期。

## 持续训练（Continuous Training, CT）

持续训练是 ML CI/CD 的核心环节——当数据分布变化、新数据到来或模型性能退化时，自动触发模型重训练。

### 触发机制

- **定时触发**：按固定时间间隔（每日/每周）重新训练
- **数据量触发**：新标注数据达到一定阈值时触发
- **性能触发**：监控模型在生产环境的表现，当指标低于阈值时触发
- **数据漂移触发**：检测到输入数据分布发生显著变化时触发

### 数据漂移检测

数据漂移（Data Drift）是指生产环境中流入的数据分布与训练数据分布出现偏差。常见检测方法：
- **统计检验**：Kolmogorov-Smirnov 检验、卡方检验比较特征分布
- **距离度量**：Population Stability Index (PSI)、Wasserstein 距离
- **模型性能监控**：当模型预测置信度分布变化或业务指标下降时报警
- **对抗性验证**：训练一个分类器区分训练数据和生产数据，若分类准确率显著高于 50%，说明分布已有差异

### 模型验证门控

重训练完成后，新模型必须通过验证门控（Validation Gate）才能部署：
- **离线评估**：在 hold-out 验证集上的指标必须不低于当前生产模型
- **A/B 测试**：小流量对比新旧模型
- **安全门控**：规则检测（如偏见检测、毒性检测）必须通过
- **性能门控**：推理延迟、内存占用不超过预设上限
- **若新模型未通过任何门控，自动阻止部署并告警**

## 部署策略

### Canary 部署
新模型先部署到少数实例或小比例流量，逐步扩大流量。若新模型出现异常（错误率上升、延迟飙升），可快速回滚。适合风险较高的模型更新。

### Blue-Green 部署
维护两套完全相同的生产环境——Blue（当前活跃）和 Green（新版本部署和预热）。新模型在 Green 环境完成部署和验证后，通过路由切换将所有流量瞬间切到 Green。优点是回滚极快（切回 Blue 即可），缺点是需要双倍计算资源。

### Shadow 部署
新模型以“影子模式”接收真实生产流量的拷贝，输出记录但不返回给用户。这种方式可在不承担实际风险的情况下收集新模型的真实表现数据。

## LLM 特有的 CI/CD 挑战

### 提示变更管理
在 LLM 应用中，提示模板（Prompt Template）是关键的“配置资产”——修改提示可能导致输出质量突变。CI/CD 管道需要：
- 对提示版本进行类似代码的版本控制（Git）
- 自动化回归测试：使用固定测试集评估新提示的表现
- 人工评审流程（类似 code review 的 prompt review）

### 无确定性输出的测试策略
LLM 的本质是生成式模型，相同输入在不同采样下可能产生不同输出。这给测试带来挑战：
- **语义等价断言**：不检查输出字符串是否完全匹配，而是用另一个 LLM 判断输出是否语义符合预期
- **统计测试**：多次采样后评估指标的统计分布
- **约束测试**：检查输出是否满足结构约束（如有效的 JSON、不含特定词）
- **参考自由测试**：通过评分器（如 GPT-4 as a judge）评估输出质量

### 成本与延迟监控
API 调用成本、推理延迟指标应作为 CI/CD 管道的一部分持续监控——新模型或新提示不应引入不可接受的成本或延迟增长。

## 主要工具生态系统

- **Kubeflow**：基于 Kubernetes 的 ML 管道平台，提供端到端的编排、实验管理和模型服务
- **MLflow Pipelines**：MLflow 生态内的管道组件，通过预定义模板快速构建 ML 管道
- **TFX (TensorFlow Extended)**：Google 内部使用的 ML 管道框架，专注于生产级 TensorFlow 模型
- **Metaflow**：Netflix 开源的数据科学工作流框架，强调易用性和与 AWS 的深度集成
- **GitHub Actions / GitLab CI + DVC**：通过 Git + DVC（Data Version Control）实现轻量级 ML CI/CD

## Quiz

**Q1: ML CI/CD 与传统软件 CI/CD 最本质的区别在于？**

A. ML 项目不需要持续集成
B. ML CI/CD 需要同时管理代码、数据和模型三个可变的要素 ✓
C. 传统软件 CI/CD 只能管理代码，不能管理环境
D. ML CI/CD 不存在任何自动化可能性

**解析**：B 正确。ML 系统的核心特征是需要管理代码、数据、模型三要素及其耦合关系，而传统软件只需管理代码。A 和 D 错误，ML CI/CD 同样需要且可以实现自动化；C 不准确，现代 CI/CD 都能管理环境。

**Q2: 以下哪种部署策略能在出现问题时实现最快速的回滚？**

A. Canary 部署
B. Blue-Green 部署 ✓
C. Shadow 部署
D. 直接全量部署

**解析**：B 正确。Blue-Green 维护两套完全相同的生产环境，通过路由瞬间切换实现秒级回滚。Canary 部署需要逐步调整流量比例；Shadow 部署根本不对外提供服务，不存在“回滚”概念；直接全量部署需要重新部署旧版本，回滚最慢。

**Q3: 针对 LLM 应用，CI/CD 管道需要对提示模板做什么特殊处理？**

A. 提示模板是固定不变的，不需要管理
B. 只需在部署时口头通知团队成员
C. 需要对提示进行版本控制、自动化回归测试和人工评审 ✓
D. 提示模板应该每天随机变更以提升多样性

**解析**：C 正确。提示是 LLM 应用的核心”配置资产”，需要像代码一样进行版本控制、自动化测试和评审流程。A 错误，提示变更是常见操作；B 错误，口头通知不可追溯不可靠；D 错误，无控制的随机变更是危险的。

## 参考资料

### 博文/教程
- **[Practitioners guide to MLOps: A framework for continuous delivery and automation of machine learning]** — Google Cloud。Google 内部 MLOps 白皮书，系统梳理 CT/CD/CI 在 ML 场景的三级成熟度模型，是行业参考标准。https://services.google.com/fh/files/misc/practitioners_guide_to_mlops_whitepaper.pdf
- **[MLflow Documentation]** — MLflow 官方文档。涵盖 MLflow Tracking、Projects、Models、Registry 的完整使用指南与最佳实践。https://mlflow.org/docs/latest/index.html
- **[DVC Documentation: CI/CD for Machine Learning]** — DVC 官方文档。介绍如何通过 DVC Pipelines 结合 GitHub Actions 实现轻量级 ML 数据与模型版本管理的 CI/CD 工作流。https://dvc.org/doc/use-cases/ci-cd-for-machine-learning
