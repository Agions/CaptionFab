import { ref } from 'vue'

export interface PanelSection {
  key: string
  label: string
  icon: 'file' | 'chart' | 'crop' | 'ocr' | 'export' | 'settings'
}

export function usePanelSections() {
  const sections = ref<PanelSection[]>([
    { key: 'files', label: '文件', icon: 'file' },
    { key: 'progress', label: '进度', icon: 'chart' },
    { key: 'roi', label: 'ROI', icon: 'crop' },
    { key: 'ocr', label: 'OCR', icon: 'ocr' },
    { key: 'export', label: '导出', icon: 'export' },
    { key: 'settings', label: '设置', icon: 'settings' },
  ])

  return { sections }
}
