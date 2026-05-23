/**
 * @file ui-meta 文件说明。
 * @description 诸神模拟器页面的 UI 元数据常量。
 */
import type { AttrKey, EquipDef, TraitDef } from '@/features/zhushen-model'

/**
 * 特性槽位中文标签映射。
 */
export const ZHUSHEN_TRAIT_SLOT_LABEL: Record<TraitDef['slot'], string> = {
  face: '脸',
  nose: '鼻子',
  hair: '头发',
  eyes: '眼睛',
  eyebrow: '眉毛',
  ears: '耳朵',
  stigma: '圣痕',
  quasi_stigma: '类圣痕',
  learning: '学习',
}

/**
 * 装备槽位中文标签映射。
 */
export const ZHUSHEN_EQUIP_SLOT_LABEL: Record<EquipDef['slot'], string> = {
  main_hand: '主手',
  off_hand: '副手',
  helmet: '头盔',
  armor: '盔甲',
  shoes: '鞋',
  accessory: '饰品',
  head_fashion: '头部时装',
  armor_fashion: '盔甲时装',
}

/**
 * 属性中文标签映射。
 */
export const ZHUSHEN_ATTR_LABEL: Record<AttrKey, string> = {
  str: '力量',
  tec: '技巧',
  agi: '敏捷',
  con: '体质',
  per: '感知',
  wil: '意志',
}

