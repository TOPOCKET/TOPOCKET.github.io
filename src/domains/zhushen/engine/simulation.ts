/**
 * @file simulation 文件说明。
 * @description 诸神模拟器领域计算门面，隔离页面与底层算法实现。
 */
import type { SimulationInput, SimulationResult } from '@/domains/zhushen/model/zhushen-model'
import type { ZhushenSimulationPort } from '@/domains/zhushen/ports'
import { simulateZhushen } from './simulator-core'

const defaultSimulationPort: ZhushenSimulationPort = {
  runSimulation: (input) => simulateZhushen(input),
}
let simulationPort: ZhushenSimulationPort = defaultSimulationPort

/**
 * 执行诸神模拟。
 * @param input 模拟输入。
 * @returns 模拟结果。
 */
export const runZhushenSimulation = (input: SimulationInput): SimulationResult => simulationPort.runSimulation(input)

export const setZhushenSimulationPort = (port: ZhushenSimulationPort): void => {
  simulationPort = port
}

export const resetZhushenSimulationPort = (): void => {
  simulationPort = defaultSimulationPort
}
