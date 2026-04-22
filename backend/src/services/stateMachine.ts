/**
 * Room execution state machine facade.
 *
 * The implementation is split by responsibility under ./stateMachine/:
 * - routing.ts: 用户消息直达指定专家、busy 检查、停止执行
 * - execution.ts: 流式调用、A2A 编排、报告生成
 */

export { routeToAgent, stopAgentRun, isRoomBusy } from './stateMachine/routing.js';
export { generateReportInline, a2aOrchestrate } from './stateMachine/execution.js';
