/**
 * 文件操作工具 — 原 useFile composable 重构为纯工具模块
 * 优化：无响应式状态，不需要 composable 包装，直接导出函数即可。
 */

import { invoke } from '@tauri-apps/api/core'

export interface FileInfo {
  path: string
  name: string
  size: number
  is_file: boolean
  is_dir: boolean
}

/** 打开文件选择对话框 */
export async function openFileDialog(title: string = 'Select File'): Promise<string | null> {
  try {
    const path = await invoke<string>('open_file_dialog', {
      title,
      filters: [],
    })
    return path
  } catch (e) {
    console.error('[FileOps] Failed to open file dialog:', e)
    return null
  }
}

/** 打开保存文件对话框 */
export async function saveFileDialog(
  title: string = 'Save File',
  defaultName: string = 'output.srt',
): Promise<string | null> {
  try {
    const path = await invoke<string>('save_file_dialog', {
      title,
      defaultName,
      filters: [],
    })
    return path
  } catch (e) {
    console.error('[FileOps] Failed to save file dialog:', e)
    return null
  }
}

/** 写入文本文件 */
export async function writeTextFile(path: string, content: string): Promise<boolean> {
  try {
    await invoke('write_text_file', { path, content })
    return true
  } catch (e) {
    console.error('[FileOps] Failed to write file:', e)
    return false
  }
}

/** 读取文本文件 */
export async function readTextFile(path: string): Promise<string | null> {
  try {
    const content = await invoke<string>('read_text_file', { path })
    return content
  } catch (e) {
    console.error('[FileOps] Failed to read file:', e)
    return null
  }
}

/** 获取文件信息 */
export async function getFileInfo(path: string): Promise<FileInfo | null> {
  try {
    const info = await invoke<FileInfo>('get_file_info', { path })
    return info
  } catch (e) {
    console.error('[FileOps] Failed to get file info:', e)
    return null
  }
}

/** 导出字幕到文件 */
export async function exportSubtitles(
  content: string,
  format: string,
  baseName: string = 'subtitle',
): Promise<string | null> {
  const extensions: Record<string, string> = {
    srt: 'srt', vtt: 'vtt', ass: 'ass', ssa: 'ssa',
    json: 'json', txt: 'txt', lrc: 'lrc', sbv: 'sbv', csv: 'csv',
  }

  const ext = extensions[format] || 'txt'
  const defaultName = `${baseName}.${ext}`

  const filePath = await saveFileDialog(`Export ${format.toUpperCase()}`, defaultName)
  if (!filePath) return null

  const success = await writeTextFile(filePath, content)
  return success ? filePath : null
}
