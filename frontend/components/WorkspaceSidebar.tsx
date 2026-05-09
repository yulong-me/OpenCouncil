'use client'

import { useCallback, useMemo, useState } from 'react'
import { FolderTree, GitBranch } from 'lucide-react'

import { fetchGitDiff, openWorkspacePath, previewWorkspaceFile, type WorkspaceOpenTarget } from '@/lib/workspace'
import { debug, warn } from '@/lib/logger'

import { WorkspaceFilesPanel } from './WorkspaceFilesPanel'
import { WorkspaceGitPanel } from './WorkspaceGitPanel'
import { WorkspacePreviewDialog } from './WorkspacePreviewDialog'

type WorkspaceTab = 'files' | 'git'

interface PreviewState {
  open: boolean
  title: string
  subtitle?: string
  kind: 'file' | 'diff'
  diffView?: 'text' | 'split'
  loading: boolean
  error: string | null
  content: string
  emptyLabel: string
  footer?: string | null
}

interface WorkspaceSidebarProps {
  workspacePath: string
}

const EMPTY_PREVIEW: PreviewState = {
  open: false,
  title: '',
  kind: 'file',
  diffView: 'text',
  loading: false,
  error: null,
  content: '',
  emptyLabel: '',
  footer: null,
}

export function WorkspaceSidebar({ workspacePath }: WorkspaceSidebarProps) {
  const [tab, setTab] = useState<WorkspaceTab>('files')
  const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW)
  const [externalNotice, setExternalNotice] = useState<string | null>(null)
  const [externalError, setExternalError] = useState<string | null>(null)

  const workspaceLabel = useMemo(() => {
    const parts = workspacePath.split(/[/\\]/).filter(Boolean)
    return parts.at(-1) || workspacePath
  }, [workspacePath])

  const openExternal = useCallback(async (absolutePath: string, target: WorkspaceOpenTarget) => {
    setExternalError(null)
    try {
      await openWorkspacePath(workspacePath, absolutePath, target)
      setExternalNotice(target === 'finder' ? '已在 Finder 中打开' : '已在 VS Code 中打开')
      window.setTimeout(() => setExternalNotice(null), 2400)
    } catch (err) {
      setExternalError((err as Error).message || '无法打开路径')
    }
  }, [workspacePath])

  const openFilePreview = useCallback(async (absolutePath: string) => {
    setPreview({
      open: true,
      title: absolutePath.split(/[/\\]/).filter(Boolean).at(-1) || absolutePath,
      subtitle: absolutePath,
        kind: 'file',
        diffView: 'text',
        loading: true,
      error: null,
      content: '',
      emptyLabel: '该文件没有可显示内容',
      footer: null,
    })

    try {
      const result = await previewWorkspaceFile(absolutePath)
      debug('ui:workspace:file_preview_open', {
        workspacePath,
        path: result.path,
        size: result.size,
        truncated: result.truncated,
        isBinary: result.isBinary,
      })
      setPreview({
        open: true,
        title: result.name,
        subtitle: result.path,
        kind: 'file',
        diffView: 'text',
        loading: false,
        error: null,
        content: result.isBinary ? '' : (result.content || ''),
        emptyLabel: result.isBinary ? '这是一个二进制文件，暂不支持文本预览。' : '该文件为空',
        footer: result.truncated ? `已截断，仅显示前 ${Math.min(result.size, 128 * 1024)} 字节。` : `${result.size} bytes`,
      })
    } catch (err) {
      warn('ui:workspace:file_preview_failed', { workspacePath, path: absolutePath, error: err })
      setPreview({
        open: true,
        title: absolutePath.split(/[/\\]/).filter(Boolean).at(-1) || absolutePath,
        subtitle: absolutePath,
        kind: 'file',
        diffView: 'text',
        loading: false,
        error: (err as Error).message || '无法预览文件',
        content: '',
        emptyLabel: '无法预览文件',
        footer: null,
      })
    }
  }, [])

  const openDiffPreview = useCallback(async (filePath: string, staged: boolean) => {
    setPreview({
      open: true,
      title: filePath,
      subtitle: staged ? 'staged diff' : 'working tree diff',
      kind: 'diff',
      diffView: 'split',
      loading: true,
      error: null,
      content: '',
      emptyLabel: '没有 diff',
      footer: null,
    })

    try {
      const result = await fetchGitDiff(workspacePath, { filePath, staged })
      debug('ui:workspace:diff_preview_open', {
        workspacePath,
        filePath,
        staged,
        diffLength: result.diff.length,
      })
      setPreview({
        open: true,
        title: filePath,
        subtitle: staged ? 'staged diff' : 'working tree diff',
        kind: 'diff',
        diffView: 'split',
        loading: false,
        error: null,
        content: result.diff,
        emptyLabel: '当前文件没有 diff',
        footer: staged ? '来自暂存区' : '来自工作区',
      })
    } catch (err) {
      warn('ui:workspace:diff_preview_failed', { workspacePath, filePath, staged, error: err })
      setPreview({
        open: true,
        title: filePath,
        subtitle: staged ? 'staged diff' : 'working tree diff',
        kind: 'diff',
        diffView: 'split',
        loading: false,
        error: (err as Error).message || '无法读取 diff',
        content: '',
        emptyLabel: '无法读取 diff',
        footer: null,
      })
    }
  }, [workspacePath])

  const reviewStagedChanges = useCallback(async () => {
    setPreview({
      open: true,
      title: 'Staged Review',
      subtitle: workspacePath,
      kind: 'diff',
      diffView: 'text',
      loading: true,
      error: null,
      content: '',
      emptyLabel: '暂存区为空',
      footer: null,
    })

    try {
      const result = await fetchGitDiff(workspacePath, { staged: true })
      debug('ui:workspace:staged_review_open', {
        workspacePath,
        diffLength: result.diff.length,
      })
      setPreview({
        open: true,
        title: 'Staged Review',
        subtitle: workspacePath,
        kind: 'diff',
        diffView: 'text',
        loading: false,
        error: null,
        content: result.diff,
        emptyLabel: '暂存区为空',
        footer: '以下为当前工作区已暂存改动',
      })
    } catch (err) {
      warn('ui:workspace:staged_review_failed', { workspacePath, error: err })
      setPreview({
        open: true,
        title: 'Staged Review',
        subtitle: workspacePath,
        kind: 'diff',
        diffView: 'text',
        loading: false,
        error: (err as Error).message || '无法读取暂存区 diff',
        content: '',
        emptyLabel: '无法读取暂存区 diff',
        footer: null,
      })
    }
  }, [workspacePath])

  return (
    <>
      <div className="space-y-2 rounded-[9px] border border-line bg-surface px-[10px] py-[10px] shadow-none">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft/45">Workspace</p>
            <p className="mt-1 truncate text-[12px] font-semibold text-ink" title={workspacePath}>
              {workspaceLabel}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Workspace 视图"
            className="inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-line bg-surface-muted/70 p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'files'}
              onClick={() => {
                debug('ui:workspace:tab_change', { workspacePath, tab: 'files' })
                setTab('files')
              }}
              className={`inline-flex h-6 items-center gap-1 rounded px-1.5 text-[10.5px] font-medium transition-colors ${
                tab === 'files'
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-ink-soft hover:bg-surface hover:text-ink'
              }`}
            >
              <FolderTree className="h-3.5 w-3.5" aria-hidden />
              Files
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'git'}
              onClick={() => {
                debug('ui:workspace:tab_change', { workspacePath, tab: 'git' })
                setTab('git')
              }}
              className={`inline-flex h-6 items-center gap-1 rounded px-1.5 text-[10.5px] font-medium transition-colors ${
                tab === 'git'
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-ink-soft hover:bg-surface hover:text-ink'
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden />
              Git
            </button>
          </div>
        </div>

        {externalNotice && <p className="tone-success-text text-[10px]">{externalNotice}</p>}
        {externalError && <p className="tone-danger-text text-[10px]">{externalError}</p>}

        {tab === 'files'
          ? <WorkspaceFilesPanel workspacePath={workspacePath} onOpenFile={openFilePreview} onOpenExternal={openExternal} />
          : <WorkspaceGitPanel workspacePath={workspacePath} onOpenDiff={openDiffPreview} onReviewStaged={reviewStagedChanges} />
        }
      </div>

      <WorkspacePreviewDialog
        open={preview.open}
        title={preview.title}
        subtitle={preview.subtitle}
        kind={preview.kind}
        diffView={preview.diffView}
        loading={preview.loading}
        error={preview.error}
        content={preview.content}
        emptyLabel={preview.emptyLabel}
        footer={preview.footer}
        onClose={() => setPreview(EMPTY_PREVIEW)}
      />
    </>
  )
}
