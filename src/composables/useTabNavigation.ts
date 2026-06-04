import { ref, type Ref } from 'vue'

export interface TabInfo {
  key: string
  icon: string
  label: string
}

export function useTabNavigation(activeTab: Ref<string>) {
  const tabRefs = ref<HTMLElement[]>([])

  const sections: TabInfo[] = [
    { key: 'files', icon: 'file', label: '文件' },
    { key: 'progress', icon: 'chart', label: '进度' },
    { key: 'roi', icon: 'crop', label: '区域' },
    { key: 'ocr', icon: 'ocr', label: 'OCR' },
    { key: 'export', icon: 'export', label: '导出' },
    { key: 'settings', icon: 'settings', label: '设置' },
  ]

  function handleTabKeydown(e: KeyboardEvent) {
    const currentIndex = sections.findIndex(t => t.key === activeTab.value)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % sections.length
      activeTab.value = sections[nextIndex].key
      tabRefs.value[nextIndex]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (currentIndex - 1 + sections.length) % sections.length
      activeTab.value = sections[prevIndex].key
      tabRefs.value[prevIndex]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      activeTab.value = sections[0].key
      tabRefs.value[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      activeTab.value = sections[sections.length - 1].key
      tabRefs.value[sections.length - 1]?.focus()
    }
  }

  return {
    sections,
    tabRefs,
    handleTabKeydown
  }
}
