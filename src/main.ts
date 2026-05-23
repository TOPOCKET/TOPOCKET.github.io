/**
 * @file main 文件说明。
 * @description 模块导出定义。
 */
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './app/router'

createApp(App).use(router).mount('#app')
