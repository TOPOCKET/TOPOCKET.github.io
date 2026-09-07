<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatVec } from '@/domains/zhushen/model/zhushen-model'
import { SurfaceCard } from '@/shared/ui'
import { useZhushenSimulatorPageState } from '../composables/useZhushenSimulatorPageState'

const {
  activeEquipIds,
  activeSkillIds,
  activeTraitIds,
  addCustomEquip,
  addCustomJob,
  addCustomSkill,
  addCustomTrait,
  addPromotion,
  aggressiveConfirmed,
  applyPlanToManual,
  attrKeys,
  attrLabel,
  beamWidth,
  calculate,
  characterBase,
  characterGrowth,
  characterTrait,
  constrainedSearchParams,
  equipFilter,
  equipSlotLabel,
  equips,
  errorText,
  exportDebugSnapshot,
  filteredEquips,
  filteredPromoEquips,
  filteredPromoSkills,
  filteredSkills,
  filteredTraits,
  ignorePromotionRequirements,
  importDebugSnapshot,
  initialJobId,
  jobs,
  maxSkillPerStep,
  maxTierDelta,
  maxTransfer,
  newEquipJson,
  newJobJson,
  newSkillJson,
  newTraitJson,
  output,
  promoEquipFilter,
  promoSkillFilter,
  promotions,
  removePromotion,
  resetCustom,
  scorePreset,
  searchEnabled,
  searchFinalEquipIds,
  searchFinalSkillIds,
  searchPending,
  searchProfile,
  searchProgress,
  searchRiskWarning,
  searchSummary,
  searchTargetFinalJobId,
  selectionError,
  skillFilter,
  skills,
  targetLevel,
  toggle,
  topPlans,
  traitFilter,
  traitSlotLabel,
  enforceEquipSlots,
  enforceSkillMax3,
  enforceTraitSlots,
} = useZhushenSimulatorPageState()
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="mb-1 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">诸神皇冠培养模拟器</h1>
        <p class="text-sm text-[var(--text-muted)] sm:text-base">统一录入角色基础、固有特性、成长、转职条件与终态配置，减少手算误差。</p>
      </div>
      <RouterLink to="/" class="ui-btn ui-btn--ghost">返回首页</RouterLink>
    </header>

    <SurfaceCard
      decorative
      motion-key="zhushen:simulator:hero"
      class="mb-5"
      body-class="p-5 sm:p-6"
    >
      <div class="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">Manual + Search</p>
          <h2 class="mt-2 text-xl font-semibold text-[var(--text-primary)]">角色输入与终态建模</h2>
          <p class="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
            手动模拟与自动搜索共用同一套输入。这里录入角色基础属性、固有特性、成长六维，以及会影响最终面板的装备、技能、额外特性。
          </p>
        </div>
        <div class="zhushen-chip-row">
          <span class="ui-chip">目标等级 1-150</span>
          <span class="ui-chip">Lv60 后成长系数 0.35</span>
          <span class="ui-chip">转职步骤含装备/技能门槛</span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label class="text-sm">
          目标等级
          <input v-model.number="targetLevel" type="number" min="1" max="150" class="ui-input mt-1 w-full px-3 py-2" />
        </label>
        <label class="text-sm">
          初始职业
          <select v-model="initialJobId" class="ui-input mt-1 w-full px-3 py-2">
            <option v-for="j in jobs" :key="j.id" :value="j.id">{{ j.name }} ({{ j.id }})</option>
          </select>
        </label>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div class="zhushen-subcard">
          <div class="mb-3">
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">角色基础属性</h3>
            <p class="mt-1 text-xs text-[var(--text-muted)]">用于补齐角色出生面板或外部已知的固定初值。</p>
          </div>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label v-for="key in attrKeys" :key="`base-${key}`" class="zhushen-stat-field">
              <span class="zhushen-stat-label">{{ attrLabel[key] }}</span>
              <input v-model.number="characterBase[key]" type="number" step="1" class="ui-input mt-1 w-full px-2 py-1.5" />
            </label>
          </div>
        </div>

        <div class="zhushen-subcard">
          <div class="mb-3">
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">角色固有特性</h3>
            <p class="mt-1 text-xs text-[var(--text-muted)]">用于录入角色自带 trait，不与下方可勾选特性池混淆。</p>
          </div>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label v-for="key in attrKeys" :key="`trait-${key}`" class="zhushen-stat-field">
              <span class="zhushen-stat-label">{{ attrLabel[key] }}</span>
              <input v-model.number="characterTrait[key]" type="number" step="1" class="ui-input mt-1 w-full px-2 py-1.5" />
            </label>
          </div>
        </div>

        <div class="zhushen-subcard">
          <div class="mb-3">
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">角色成长六维</h3>
            <p class="mt-1 text-xs text-[var(--text-muted)]">每级成长基础值，会与当前职业成长叠加后参与逐级累计。</p>
          </div>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label v-for="key in attrKeys" :key="`growth-${key}`" class="zhushen-stat-field">
              <span class="zhushen-stat-label">{{ attrLabel[key] }}</span>
              <input v-model.number="characterGrowth[key]" type="number" step="0.0001" class="ui-input mt-1 w-full px-2 py-1.5" />
            </label>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="zhushen-picker">
          <p class="zhushen-picker__title">额外特性（多选）</p>
          <select v-model="traitFilter" class="ui-input mt-1 w-full px-2 py-1 text-xs">
            <option value="all">全部位置</option>
            <option v-for="(name, key) in traitSlotLabel" :key="key" :value="key">{{ name }}</option>
          </select>
          <div class="zhushen-scrollbox mt-2">
            <label v-for="t in filteredTraits" :key="t.id" class="zhushen-option">
              <input type="checkbox" :checked="activeTraitIds.includes(t.id)" @change="() => { const next = enforceTraitSlots(toggle(activeTraitIds, t.id)); if (next) activeTraitIds = next }" />
              <span>{{ t.name }} <span class="text-[var(--text-muted)]">({{ traitSlotLabel[t.slot] }})</span></span>
            </label>
          </div>
        </div>

        <div class="zhushen-picker">
          <p class="zhushen-picker__title">最终装备（多选）</p>
          <select v-model="equipFilter" class="ui-input mt-1 w-full px-2 py-1 text-xs">
            <option value="all">全部分类</option>
            <option v-for="(name, key) in equipSlotLabel" :key="key" :value="key">{{ name }}</option>
          </select>
          <div class="zhushen-scrollbox mt-2">
            <label v-for="e in filteredEquips" :key="e.id" class="zhushen-option">
              <input type="checkbox" :checked="activeEquipIds.includes(e.id)" @change="() => { const next = enforceEquipSlots(toggle(activeEquipIds, e.id), '最终装备'); if (next) activeEquipIds = next }" />
              <span>{{ e.name }} <span class="text-[var(--text-muted)]">({{ equipSlotLabel[e.slot] }})</span></span>
            </label>
          </div>
        </div>

        <div class="zhushen-picker">
          <p class="zhushen-picker__title">最终技能（多选）</p>
          <select v-model="skillFilter" class="ui-input mt-1 w-full px-2 py-1 text-xs">
            <option value="all">全部属性</option>
            <option v-for="(name, key) in attrLabel" :key="key" :value="key">{{ name }}</option>
          </select>
          <div class="zhushen-scrollbox mt-2">
            <label v-for="s in filteredSkills" :key="s.id" class="zhushen-option">
              <input type="checkbox" :checked="activeSkillIds.includes(s.id)" @change="() => { const next = enforceSkillMax3(toggle(activeSkillIds, s.id), '最终技能'); if (next) activeSkillIds = next }" />
              <span>{{ s.name }} <span class="text-[var(--text-muted)]">({{ attrLabel[s.category] }})</span></span>
            </label>
          </div>
        </div>
      </div>
    </SurfaceCard>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
      <SurfaceCard class="h-fit" body-class="p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold">转职路径</h2>
            <p class="mt-1 text-xs text-[var(--text-muted)]">按等级顺序枚举转职，步骤中的装备与技能只参与该步达标判定。</p>
          </div>
          <button class="ui-btn ui-btn--ghost" @click="addPromotion">新增</button>
        </div>

        <div v-if="promotions.length === 0" class="zhushen-empty">当前没有手动转职步骤，将按初始职业一直成长到目标等级。</div>
        <div v-for="(step, idx) in promotions" :key="idx" class="zhushen-subcard mb-3 last:mb-0">
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-[120px_minmax(0,1fr)_auto]">
            <label class="text-xs">
              转职等级
              <input v-model.number="step.level" type="number" min="1" max="149" class="ui-input mt-1 w-full px-2 py-1.5" />
            </label>
            <label class="text-xs">
              目标职业
              <select v-model="step.toJobId" class="ui-input mt-1 w-full px-2 py-1.5">
                <option v-for="j in jobs" :key="j.id" :value="j.id">{{ j.name }}</option>
              </select>
            </label>
            <button class="ui-btn ui-btn--ghost h-fit w-fit self-end" @click="removePromotion(idx)">删除</button>
          </div>

          <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div>
              <p class="zhushen-picker__title">该步装备</p>
              <select v-model="promoEquipFilter" class="ui-input mt-1 w-full px-2 py-1 text-xs">
                <option value="all">全部分类</option>
                <option v-for="(name, key) in equipSlotLabel" :key="key" :value="key">{{ name }}</option>
              </select>
              <div class="zhushen-scrollbox mt-2">
                <label v-for="e in filteredPromoEquips" :key="e.id" class="zhushen-option">
                  <input type="checkbox" :checked="step.equipIds.includes(e.id)" @change="() => { const next = enforceEquipSlots(toggle(step.equipIds, e.id), '转职步骤装备'); if (next) promotions[idx].equipIds = next }" />
                  <span>{{ e.name }} <span class="text-[var(--text-muted)]">({{ equipSlotLabel[e.slot] }})</span></span>
                </label>
              </div>
            </div>

            <div>
              <p class="zhushen-picker__title">该步技能</p>
              <select v-model="promoSkillFilter" class="ui-input mt-1 w-full px-2 py-1 text-xs">
                <option value="all">全部属性</option>
                <option v-for="(name, key) in attrLabel" :key="key" :value="key">{{ name }}</option>
              </select>
              <div class="zhushen-scrollbox mt-2">
                <label v-for="s in filteredPromoSkills" :key="s.id" class="zhushen-option">
                  <input type="checkbox" :checked="step.skillIds.includes(s.id)" @change="() => { const next = enforceSkillMax3(toggle(step.skillIds, s.id), '转职步骤技能'); if (next) promotions[idx].skillIds = next }" />
                  <span>{{ s.name }} <span class="text-[var(--text-muted)]">({{ attrLabel[s.category] }})</span></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <div class="space-y-5">
        <SurfaceCard body-class="p-5">
          <div class="mb-4">
            <h2 class="text-base font-semibold">搜索配置</h2>
            <p class="mt-1 text-xs text-[var(--text-muted)]">搜索下界已改为“精确的无转职基线路线”，不再使用高估公式参与剪枝。</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs">启用<select v-model="searchEnabled" class="ui-input mt-1 w-full px-2 py-1.5"><option :value="true">true</option><option :value="false">false</option></select></label>
            <label class="text-xs">忽略转职条件<select v-model="ignorePromotionRequirements" class="ui-input mt-1 w-full px-2 py-1.5"><option :value="true">true</option><option :value="false">false</option></select></label>
            <label class="text-xs">参数档位<select v-model="searchProfile" class="ui-input mt-1 w-full px-2 py-1.5"><option value="safe">safe</option><option value="balanced">balanced</option><option value="aggressive">aggressive</option></select></label>
            <label class="text-xs">评分<select v-model="scorePreset" class="ui-input mt-1 w-full px-2 py-1.5"><option value="sum">sum</option><option value="str_first">str_first</option><option value="agi_first">agi_first</option><option value="balanced">balanced</option></select></label>
            <label class="text-xs">Beam<input v-model.number="beamWidth" type="number" min="10" max="5000" class="ui-input mt-1 w-full px-2 py-1.5" /></label>
            <label class="text-xs">最大转职<input v-model.number="maxTransfer" type="number" min="0" max="20" class="ui-input mt-1 w-full px-2 py-1.5" /></label>
            <label class="text-xs">跨阶<input v-model.number="maxTierDelta" type="number" min="0" max="3" class="ui-input mt-1 w-full px-2 py-1.5" /></label>
            <label class="text-xs">步内技能<input v-model.number="maxSkillPerStep" type="number" min="0" max="3" class="ui-input mt-1 w-full px-2 py-1.5" /></label>
          </div>

          <div class="mt-3">
            <label class="text-xs">
              目标终点职业
              <select v-model="searchTargetFinalJobId" class="ui-input mt-1 w-full px-2 py-1.5">
                <option v-for="j in jobs" :key="j.id" :value="j.id">{{ j.name }}</option>
              </select>
            </label>
          </div>

          <div class="mt-3 grid grid-cols-1 gap-3">
            <div class="zhushen-picker">
              <p class="zhushen-picker__title">搜索最终装备</p>
              <div class="zhushen-scrollbox mt-2">
                <label v-for="e in equips" :key="e.id" class="zhushen-option">
                  <input type="checkbox" :checked="searchFinalEquipIds.includes(e.id)" @change="() => { const next = enforceEquipSlots(toggle(searchFinalEquipIds, e.id), '搜索最终装备'); if (next) searchFinalEquipIds = next }" />
                  <span>{{ e.name }} <span class="text-[var(--text-muted)]">({{ equipSlotLabel[e.slot] }})</span></span>
                </label>
              </div>
            </div>
            <div class="zhushen-picker">
              <p class="zhushen-picker__title">搜索最终技能</p>
              <div class="zhushen-scrollbox mt-2">
                <label v-for="s in skills" :key="s.id" class="zhushen-option">
                  <input type="checkbox" :checked="searchFinalSkillIds.includes(s.id)" @change="() => { const next = enforceSkillMax3(toggle(searchFinalSkillIds, s.id), '搜索最终技能'); if (next) searchFinalSkillIds = next }" />
                  <span>{{ s.name }} <span class="text-[var(--text-muted)]">({{ attrLabel[s.category] }})</span></span>
                </label>
              </div>
            </div>
          </div>

          <p v-if="searchRiskWarning" class="mt-3 text-xs text-[var(--warn-text)]">{{ searchRiskWarning }}</p>
          <p class="mt-2 text-xs text-[var(--text-muted)]">
            生效参数: Beam={{ constrainedSearchParams.beamWidth }} / 最大转职={{ constrainedSearchParams.maxTransfer }} / 跨阶={{ constrainedSearchParams.maxTierDelta }} / 步内技能={{ constrainedSearchParams.maxSkillPerStep }}
          </p>
          <label v-if="searchProfile === 'aggressive'" class="mt-2 inline-flex items-center gap-2 text-xs text-[var(--warn-text)]">
            <input v-model="aggressiveConfirmed" type="checkbox" />
            我已确认激进档可能导致耗时显著增加
          </label>
        </SurfaceCard>

        <SurfaceCard body-class="p-5">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">本地临时添加</h2>
              <p class="mt-1 text-xs text-[var(--text-muted)]">用于临时扩充职业、装备、技能、特性数据，不会改动内置数据源。</p>
            </div>
            <button class="ui-btn ui-btn--ghost" @click="resetCustom">重置</button>
          </div>
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div><p class="mb-1 text-sm">职业 JSON</p><textarea v-model="newJobJson" rows="7" class="ui-input w-full px-2 py-1 text-xs" /><button class="ui-btn ui-btn--primary mt-2" @click="addCustomJob">保存</button></div>
            <div><p class="mb-1 text-sm">装备 JSON</p><textarea v-model="newEquipJson" rows="7" class="ui-input w-full px-2 py-1 text-xs" /><button class="ui-btn ui-btn--primary mt-2" @click="addCustomEquip">保存</button></div>
            <div><p class="mb-1 text-sm">技能 JSON</p><textarea v-model="newSkillJson" rows="7" class="ui-input w-full px-2 py-1 text-xs" /><button class="ui-btn ui-btn--primary mt-2" @click="addCustomSkill">保存</button></div>
            <div><p class="mb-1 text-sm">特性 JSON</p><textarea v-model="newTraitJson" rows="7" class="ui-input w-full px-2 py-1 text-xs" /><button class="ui-btn ui-btn--primary mt-2" @click="addCustomTrait">保存</button></div>
          </div>
        </SurfaceCard>
      </div>
    </div>

    <SurfaceCard as="div" class="my-5" body-class="p-4 sm:p-5">
      <div class="flex flex-wrap items-center gap-2">
        <button class="ui-btn ui-btn--primary" :disabled="searchPending" @click="calculate">{{ searchPending ? '搜索中...' : '计算' }}</button>
        <button class="ui-btn ui-btn--ghost" @click="exportDebugSnapshot">导出快照</button>
        <label class="ui-btn ui-btn--ghost cursor-pointer">
          导入快照
          <input class="hidden" type="file" accept="application/json" @change="importDebugSnapshot" />
        </label>
      </div>
      <div v-if="searchPending && searchProgress" class="mt-3">
        <progress class="h-2 w-full" :max="searchProgress.totalSteps" :value="searchProgress.step" />
        <p class="text-sm text-[var(--text-muted)]">
          搜索进度: {{ searchProgress.step }}/{{ searchProgress.totalSteps }} | Beam: {{ searchProgress.beamSize }} | 候选: {{ searchProgress.candidateSize }}
        </p>
        <p class="text-xs text-[var(--text-muted)]">
          已探索: {{ searchProgress.exploredStates }} | 已剪枝: {{ searchProgress.prunedByDominance }} | 状态池: {{ searchProgress.poolSize }} | 压缩次数: {{ searchProgress.compactionCount }}
        </p>
        <p class="text-xs text-[var(--text-muted)]">
          峰值状态池: {{ searchProgress.poolPeak }} | 本轮耗时: {{ searchProgress.stepMs }}ms | route命中: {{ searchProgress.routePrunes }}/{{ searchProgress.routeChecks }} | group命中: {{ searchProgress.groupPrunes }}/{{ searchProgress.groupChecks }}
        </p>
      </div>
      <p v-if="selectionError" class="mt-2 text-sm text-[var(--warn-text)]">{{ selectionError }}</p>
      <p v-if="errorText" class="mt-2 text-sm text-[var(--warn-text)]">{{ errorText }}</p>
    </SurfaceCard>

    <section v-if="output" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SurfaceCard as="article" decorative motion-key="zhushen:simulator:result" body-class="p-5">
        <h2 class="mb-2 text-base font-semibold">最终结果</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="zhushen-result-block">
            <p class="text-xs text-[var(--text-muted)]">当前职业</p>
            <p class="mt-1 text-lg font-semibold text-[var(--text-primary)]">{{ output.jobName }}</p>
          </div>
          <div class="zhushen-result-block">
            <p class="text-xs text-[var(--text-muted)]">成长累计</p>
            <p class="mt-1 text-sm">{{ formatVec(output.growthAcc) }}</p>
          </div>
        </div>
        <div class="zhushen-result-block mt-3">
          <p class="text-xs text-[var(--text-muted)]">最终面板</p>
          <p class="mt-1 text-sm">{{ formatVec(output.final) }}</p>
        </div>
      </SurfaceCard>

      <SurfaceCard as="article" body-class="p-5">
        <h2 class="mb-2 text-base font-semibold">转职日志</h2>
        <p v-if="output.logs.length === 0" class="text-sm text-[var(--text-muted)]">无转职</p>
        <ul v-else class="space-y-2 text-sm">
          <li v-for="item in output.logs" :key="item" class="zhushen-log-line">{{ item }}</li>
        </ul>
      </SurfaceCard>
    </section>

    <SurfaceCard v-if="searchSummary" class="mt-4" body-class="p-5">
      <h2 class="mb-2 text-base font-semibold">Beam Search 结果</h2>
      <p class="text-sm text-[var(--text-muted)]">
        已探索状态数: {{ searchSummary.exploredStates }} | 支配剪枝数: {{ searchSummary.prunedByDominance }}
      </p>
      <ul class="mt-3 space-y-2 text-sm">
        <li v-for="plan in topPlans" :key="plan.rank" class="zhushen-subcard flex flex-col gap-2">
          <span>#{{ plan.rank }} 评分={{ plan.score.toFixed(4) }} | {{ formatVec(plan.final) }} | 路线: {{ plan.route }}</span>
          <button class="ui-btn ui-btn--ghost w-fit" @click="applyPlanToManual(plan)">一键回填到手动路线</button>
        </li>
      </ul>
    </SurfaceCard>
  </main>
</template>

<style scoped>
.zhushen-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.zhushen-subcard,
.zhushen-picker,
.zhushen-result-block,
.zhushen-empty,
.zhushen-log-line {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgb(255 255 255 / 0.02);
  backdrop-filter: blur(calc(var(--glass-blur) * 0.58)) saturate(112%);
}

.zhushen-subcard,
.zhushen-picker,
.zhushen-result-block,
.zhushen-empty {
  padding: 14px;
}

.zhushen-stat-field {
  display: block;
  font-size: 12px;
}

.zhushen-stat-label,
.zhushen-picker__title {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.zhushen-scrollbox {
  max-height: 152px;
  overflow: auto;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: transparent;
  padding: 8px 10px;
}

.zhushen-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
}

.zhushen-option input {
  margin-top: 2px;
}

.zhushen-empty {
  color: var(--text-muted);
  font-size: 14px;
}

.zhushen-log-line {
  padding: 10px 12px;
}
</style>
