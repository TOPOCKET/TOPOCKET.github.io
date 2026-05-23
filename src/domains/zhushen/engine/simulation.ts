/**
 * @file simulation 文件说明。
 * @description 诸神模拟器领域计算门面，隔离页面与底层算法实现。
 */
import type { SimulationInput, SimulationResult } from '@/features/zhushen-model'
import { simulateZhushen } from './simulator-core'

/**
 * 执行诸神模拟。
 * @param input 模拟输入。
 * @returns 模拟结果。
 */
export const runZhushenSimulation = (input: SimulationInput): SimulationResult => simulateZhushen(input)
