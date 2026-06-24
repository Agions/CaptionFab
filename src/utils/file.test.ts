import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openFileDialog, saveFileDialog, writeTextFile, readTextFile, getFileInfo, exportSubtitles, type FileInfo } from '@/utils/file'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

const { invoke } = await import('@tauri-apps/api/core')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('openFileDialog', () => {
  it('returns path on success', async () => {
    ;(invoke as any).mockResolvedValue('/path/to/file.mp4')
    const result = await openFileDialog('Open Video')
    expect(result).toBe('/path/to/file.mp4')
    expect(invoke).toHaveBeenCalledWith('open_file_dialog', { title: 'Open Video', filters: [] })
  })

  it('returns null on error', async () => {
    ;(invoke as any).mockRejectedValue(new Error('dialog failed'))
    const result = await openFileDialog('Open Video')
    expect(result).toBeNull()
  })
})

describe('saveFileDialog', () => {
  it('returns path on success', async () => {
    ;(invoke as any).mockResolvedValue('/path/to/output.srt')
    const result = await saveFileDialog('Save', 'output.srt')
    expect(result).toBe('/path/to/output.srt')
    expect(invoke).toHaveBeenCalledWith('save_file_dialog', { title: 'Save', defaultName: 'output.srt', filters: [] })
  })

  it('returns null on error', async () => {
    ;(invoke as any).mockRejectedValue(new Error('save failed'))
    const result = await saveFileDialog('Save')
    expect(result).toBeNull()
  })
})

describe('writeTextFile', () => {
  it('returns true on success', async () => {
    ;(invoke as any).mockResolvedValue(undefined)
    const result = await writeTextFile('/path/file.srt', 'subtitle content')
    expect(result).toBe(true)
    expect(invoke).toHaveBeenCalledWith('write_text_file', { path: '/path/file.srt', content: 'subtitle content' })
  })

  it('returns false on error', async () => {
    ;(invoke as any).mockRejectedValue(new Error('write failed'))
    const result = await writeTextFile('/path/file.srt', 'content')
    expect(result).toBe(false)
  })
})

describe('readTextFile', () => {
  it('returns content on success', async () => {
    ;(invoke as any).mockResolvedValue('file content')
    const result = await readTextFile('/path/file.srt')
    expect(result).toBe('file content')
    expect(invoke).toHaveBeenCalledWith('read_text_file', { path: '/path/file.srt' })
  })

  it('returns null on error', async () => {
    ;(invoke as any).mockRejectedValue(new Error('read failed'))
    const result = await readTextFile('/path/file.srt')
    expect(result).toBeNull()
  })
})

describe('getFileInfo', () => {
  it('returns FileInfo on success', async () => {
    const info: FileInfo = { path: '/path/file.mp4', name: 'file.mp4', size: 1024, is_file: true, is_dir: false }
    ;(invoke as any).mockResolvedValue(info)
    const result = await getFileInfo('/path/file.mp4')
    expect(result).toEqual(info)
    expect(invoke).toHaveBeenCalledWith('get_file_info', { path: '/path/file.mp4' })
  })

  it('returns null on error', async () => {
    ;(invoke as any).mockRejectedValue(new Error('info failed'))
    const result = await getFileInfo('/path/file.mp4')
    expect(result).toBeNull()
  })
})

describe('exportSubtitles', () => {
  it('returns filePath when save succeeds', async () => {
    ;(invoke as any).mockResolvedValue('/path/output.srt')
    const result = await exportSubtitles('subtitle content', 'srt', 'output')
    expect(result).toBe('/path/output.srt')
  })

  it('returns null when save dialog is cancelled', async () => {
    ;(invoke as any).mockResolvedValue(null)
    const result = await exportSubtitles('content', 'srt')
    expect(result).toBeNull()
  })

  it('returns null when write fails', async () => {
    ;(invoke as any).mockResolvedValue('/path/output.srt')
    ;(invoke as any).mockRejectedValueOnce(new Error('write failed'))
    const result = await exportSubtitles('content', 'srt')
    expect(result).toBeNull()
  })
})
