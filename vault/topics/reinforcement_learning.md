---
id: "reinforcement_learning"
name: "强化学习基础"
name_en: "Reinforcement Learning Fundamentals"
type: "topic"
level: 3
area: "foundations"
direction: "ml"
prerequisites: ["probability_statistics", "calculus_optimization"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["reinforcement-learning", "mdp", "q-learning", "policy-gradient", "rl"]
---

强化学习（RL）是一类通过智能体与环境的交互来学习最优决策策略的机器学习范式，核心数学框架为马尔可夫决策过程（MDP，由状态、动作、奖励、转移概率、折扣因子五元组定义）。价值函数分为状态价值函数 V(s) 和在给定状态-动作下的动作价值函数 Q(s,a)，两者通过 Bellman 期望方程和 Bellman 最优方程递归关联，构成了值迭代和策略迭代的理论基础。Q-Learning 是经典的离策略（off-policy）时序差分方法，DQN（Deep Q-Network）通过神经网络近似 Q 函数并用经验回放（Experience Replay）和目标网络（Target Network）稳定训练，在 Atari 游戏上首次展现了通用人工智能的雏形。策略梯度方法（REINFORCE 算法、PPO）直接参数化策略 π(a|s)，适用连续动作空间，理论依据为策略梯度定理。Actor-Critic 架构将策略网络（Actor）与价值网络（Critic）结合，优势函数 A(s,a)=Q(s,a)-V(s) 作为策略更新的"含金量信号"，是当前最主流的 RL 框架。RL 是 RLHF 的理论基础——通过奖励模型替代环境反馈、PPO 替代 Q-Learning 的方式，可以在对话任务上强化期望行为。

## Quiz

### Q1
**问题**: 以下哪个是 MDP 中折扣因子 γ 的核心作用？

- A. 控制动作空间的维度
- B. 权衡即时奖励与长期奖励：γ 越接近 0 越短视，越接近 1 越远视；同时也保证无限时域累积奖励的数学收敛性  ✓
- C. 决定状态转移的随机性程度
- D. 平衡探索（Exploration）和利用（Exploitation）

**解析**: 累积回报定义为 G_t = r_t + γr_{t+1} + γ²r_{t+2} + ...，γ∈[0,1]。γ=0 时策略只关心即时奖励（"鼠目寸光"）；γ=1 时对未来奖励无折扣（无限时域下可能发散，只有 episodic 任务可取）。折扣因子的引入同时满足了经济学的"时间偏好"和数学的"级数收敛性"需求。

### Q2
**问题**: DQN 中经验回放（Experience Replay）解决的核心问题是什么？

- A. 加速 Q 值收敛到最优值
- B. 打破样本之间的时间相关性（序列中相邻样本高度相关），同时提高数据利用率  ✓
- C. 减少 Q 网络参数更新所需的计算量
- D. 自动调节探索率 ε

**解析**: 在线 RL 中，当前策略生成的连续转移(s_t,a_t,r_t,s_{t+1})高度相关，直接用这些样本训练神经网络会导致"灾难性遗忘"和极不稳定的更新。经验回放池随机采样打破了样本相关性，近似满足监督学习中的 i.i.d. 假设，同时让每个转移多次被学习。

### Q3
**问题**: 策略梯度方法中引入 Baseline（通常为 V(s)）的核心原因是？

- A. 简化神经网络的结构，不需要同时输出策略和价值
- B. 在不改变梯度期望的情况下减少梯度估计的方差，使训练更稳定  ✓
- C. 保证更新后的策略一定优于当前策略
- D. 自动调节学习率以适应当前状态

**解析**: REINFORCE 通过蒙特卡洛采样估计梯度 ∇J ≈ Σ∇log π(a|s)·G_t。但 G_t 的方差极大（每一步都不同），训练极不稳定。引入与动作无关的 baseline b(s)（典型值为 V(s)）后，梯度变为 ∇log π(a|s)·(G_t - V(s))，其中 G_t - V(s) 就是优势函数的蒙特卡洛估计。数学上可证 E[∇log π·b(s)]=0，即 baseline 不引入偏差但大幅降低方差，这是 Actor-Critic 架构的关键洞察。

## 参考资料

### 教材
- **[Reinforcement Learning: An Introduction]** (Sutton & Barto, 2018) —— 强化学习领域最经典的入门教材，系统讲解 MDP、动态规划、MC 方法、TD 学习和策略梯度。http://incompleteideas.net/book/the-book-2nd.html

### 论文
- **[Human-level control through deep reinforcement learning]** (Mnih et al., 2015) —— DQN 里程碑论文，首次用深度神经网络结合 Q-Learning 在 Atari 游戏上达到人类水平。https://arxiv.org/abs/1312.5602
- **[Proximal Policy Optimization Algorithms]** (Schulman et al., 2017) —— PPO 论文，提出裁剪式目标函数约束策略更新幅度，是 RLHF 中广泛使用的算法。https://arxiv.org/abs/1707.06347

### 视频（B站/YouTube）
- **[李宏毅强化学习课程]** —— 李宏毅教授（国立台湾大学）的深度强化学习课程视频，中文讲解深入浅出，涵盖从 MDP 到 PPO 的完整体系。https://space.bilibili.com/44900/
