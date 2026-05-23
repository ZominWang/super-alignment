---
id: experiment_tracking
name: 实验追踪与模型管理
name_en: Experiment Tracking and Model Management
type: topic
level: 3
area: engineering
direction: mlops
prerequisites:
  - model_evaluation
difficulty: 2
importance: 2
status: unknown
tags:
  - experiment-tracking
  - mlflow
  - wandb
  - model-registry
  - reproducibility
---


机器学习工程与软件工程的根本差异在于：模型效果的提升需要经历海量实验迭代——调整超参数、替换架构、修改预处理、切换损失函数，每一次变动都可能是关键突破或无效尝试。在 LLM 时代，这一问题被急剧放大：模型规模庞大、训练成本高昂、评估维度多元（准确率、安全性、对齐度、推理延迟），实验管理不善意味着巨大算力和时间的浪费。本章系统介绍 MLflow、W&B、TensorBoard 三大实验追踪平台的核心能力与彼此差异，并深入讨论 LLM 评估追踪的特殊挑战——提示版本管理、采样随机性下的统计报告、安全与对齐指标的独特需求。

## 核心需求与挑战

机器学习工程与软件工程的一个核心差异在于：ML 项目的不确定性远高于传统软件。模型效果的提升往往需要通过大量实验迭代实现——调整超参数、更换模型架构、修改数据预处理、更换损失函数等。在这个过程中，以下需求变得至关重要：

- **超参数记录**：每次实验使用了什么学习率、batch size、dropout 率等
- **指标追踪**：训练曲线、验证集性能、推理延迟等随时间的变化
- **模型版本管理**：哪个模型版本对应哪次实验、用哪些数据训练
- **实验对比**：快速对比多次实验的结果，定位最优参数组合
- **可复现性**：确保他人（或几个月后的自己）能精确复现实验结果

在 LLM 时代，这些问题更加突出：模型巨大、训练成本极高、评估维度多元（准确率、安全性、对齐度、推理速度等），实验管理不善可能导致大量算力和时间浪费。

## W&B (Weights & Biases)

W&B 是目前最流行的实时实验追踪工具之一。其核心工作方式为在训练代码中插入少量 logging 语句，即可将实验数据同步到云端或自托管仪表盘：

- **实时可视化**：训练过程中 loss、accuracy 等曲线实时更新
- **超参数对比**：以并排视图或平行坐标系对比多组实验
- **模型与数据集版本溯源**：记录训练的代码版本、数据哈希、环境信息
- **团队协作**：共享实验报告、评论和比较结果
- **Sweep**：自动化超参数搜索，支持 Bayesian、Grid、Random 等策略

W&B 的 SaaS 模式降低了搭建成本，但对于数据合规要求高的场景，也支持私有化部署。

## MLflow：完整 ML 生命周期管理

MLflow 是一个开源平台，提供从实验到部署的完整 ML 生命周期管理，由四个核心组件组成：

### MLflow Tracking
使用 API 记录和查询实验的参数、指标、模型和环境信息。支持多种后端存储（本地文件、数据库、远程追踪服务器）。通过简单的 `mlflow.log_param()`, `mlflow.log_metric()`, `mlflow.log_artifact()` API 即可实现完整实验追踪。

### MLflow Projects
用 YAML 文件定义 ML 项目的运行环境（conda 环境或 Docker 镜像）和入口点。这确保了实验的可复现性——任何人都能通过 `mlflow run` 在相同环境下复现实验。

### MLflow Models
定义统一的模型打包格式，支持多种 ML 框架（PyTorch、TensorFlow、Scikit-learn、ONNX 等），并提供一致的推理 API。模型包包含模型文件、依赖列表和推理代码。MLflow Models 可以与多种部署工具集成（Docker、Kubernetes、Azure ML、AWS SageMaker 等）。

### MLflow Registry
集中式模型注册中心，管理模型的生命周期阶段（Staging、Production、Archived）。注册中心支持版本控制、阶段转换、注释和审核。通过 Registry，团队可以清晰地知道哪些模型正在生产中运行，以及它们的版本、元数据和性能。

## TensorBoard

TensorBoard 是 TensorFlow 生态的原生可视化工具，现已广泛兼容 PyTorch 等框架。它提供：
- **标量可视化**：loss、accuracy 等随时间变化
- **计算图可视化**：模型架构和操作图
- **嵌入投影仪**：高维嵌入的降维可视化（PCA、t-SNE）
- **直方图与分布**：权重和梯度的分布变化

相比 W&B 和 MLflow，TensorBoard 更轻量、本地化，适合单机开发调试，但在团队协作和模型版本管理方面功能较弱。

## LLM 评估追踪的特殊性

传统 ML 实验追踪关注准确率、loss 等确定性指标，而 LLM 评估面临独特挑战：

- **提示版本管理**：同一模型，不同提示模板可能导致天差地别的输出。提示的版本需要像代码一样被追踪和版本管理。
- **采样温度与随机性**：LLM 的生成结果具有随机性（temperature > 0），同一输入可能产生不同输出。需要在相同温度设置下评估，并报告多次采样的均值和方差。
- **生成质量指标**：除传统准确率外，还需追踪 BLEU、ROUGE、BERTScore 等文本质量指标，以及人工评估结果。
- **安全与对齐指标**：有害输出率、幻觉率、拒答率等独有的评估维度。
- **成本追踪**：API 调用成本、推理延迟等工程指标的追踪。

## 团队协作与模型迭代

实验追踪平台在团队协作中发挥关键作用：

1. **知识积累**：每次实验的经验被系统化存储，新人可快速了解历史实验路径
2. **避免重复**：通过实验对比，避免他人已尝试过的失败方向
3. **决策记录**：模型上线决策有理有据，可追溯实验依据
4. **快速迭代**：从实验到部署的 Pipeline 自动化，加速迭代周期

## Quiz

**Q1: MLflow 的四个核心组件中，哪个负责管理模型从 Staging 到 Production 的生命周期阶段？**

A. MLflow Tracking
B. MLflow Projects
C. MLflow Models
D. MLflow Registry ✓

**解析**：D 正确。MLflow Registry 是集中式模型注册中心，管理模型的版本和生命周期阶段（Staging → Production → Archived），并支持阶段转换、注释和审核。Tracking 负责记录实验数据；Projects 负责定义运行环境；Models 负责统一的模型打包格式。

**Q2: 相比传统 ML 实验追踪，LLM 评估追踪的特殊性主要体现在？**

A. LLM 模型参数更少，追踪更简单
B. 提示版本管理、采样随机性和多维度评估指标的追踪 ✓
C. LLM 训练完全不需要实验追踪
D. LLM 只能使用 TensorBoard 进行追踪

**解析**：B 正确。LLM 评估追踪需要额外关注提示模板的版本变化、temperature 带来的输出随机性（需多轮采样统计）、以及安全/对齐等专属评估维度。A 错误，LLM 参数极大，追踪更复杂；C 错误，LLM 训练同样需要追踪；D 错误，W&B 和 MLflow 等工具也广泛用于 LLM。

**Q3: W&B Sweep 功能主要解决什么问题？**

A. 清理磁盘空间
B. 自动化超参数搜索优化 ✓
C. 数据隐私保护
D. 模型部署加速

**解析**：B 正确。W&B Sweep 是自动化超参数搜索（Hyperparameter Sweep）功能，支持 Bayesian Optimization、Grid Search、Random Search 等策略，在定义好的搜索空间内自动执行多组实验并追踪结果，找到最优超参数组合。

## 参考资料

### 博文/教程
- **[MLflow Documentation]** — MLflow 官方文档。涵盖 MLflow Tracking、Projects、Models、Registry 四大组件的完整使用指南，是 ML 实验追踪和模型生命周期管理的权威参考。https://mlflow.org/docs/latest/index.html
- **[Weights & Biases Documentation]** — W&B 官方文档。介绍实时实验追踪、超参数 Sweep 自动搜索、模型与数据集版本溯源等核心功能，附有从入门到生产的完整教程。https://docs.wandb.ai/
- **[A Guide to ML Experiment Tracking]** — Neptune.ai 博客。系统对比 MLflow、W&B、TensorBoard、Neptune 等主流实验追踪工具的功能差异与适用场景，帮助团队选型。https://neptune.ai/blog/ml-experiment-tracking
