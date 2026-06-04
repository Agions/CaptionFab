import { ref } from 'vue'

export interface UseFileDropOptions {
  accept?: string
  multiple?: boolean
  onFilesSelected?: (files: File[]) => void
}

export function useFileDrop(options: UseFileDropOptions = {}) {
  const {
    accept = 'video/*',
    multiple = false,
    onFilesSelected
  } = options

  const dropZoneActive = ref(false)
  const selectedFiles = ref<File[]>([])

  function handleFileDrop(e: DragEvent) {
    e.preventDefault()
    dropZoneActive.value = false
    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    const videoFiles: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith('video/')) {
        videoFiles.push(file)
      }
    }

    if (videoFiles.length > 0) {
      selectedFiles.value = [...selectedFiles.value, ...videoFiles]
      onFilesSelected?.(videoFiles)
    }
  }

  function handleFileSelect() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) return

      const videoFiles: File[] = []
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('video/')) {
          videoFiles.push(files[i])
        }
      }

      if (videoFiles.length > 0) {
        selectedFiles.value = [...selectedFiles.value, ...videoFiles]
        onFilesSelected?.(videoFiles)
      }
    }

    input.click()
  }

  function removeFile(index: number) {
    selectedFiles.value.splice(index, 1)
  }

  function clearFiles() {
    selectedFiles.value = []
  }

  return {
    dropZoneActive,
    selectedFiles,
    handleFileDrop,
    handleFileSelect,
    removeFile,
    clearFiles
  }
}
