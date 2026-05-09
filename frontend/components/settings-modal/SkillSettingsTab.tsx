'use client'

import { useEffect, useState } from 'react'
import { BrainCircuit, Edit2, Loader2, Plus, Save, Trash2 } from 'lucide-react'

import { API_URL } from '@/lib/api'
import { info, warn } from '@/lib/logger'

import { DirectoryPicker } from '../DirectoryPicker'
import type { ReadOnlySkill, SkillConfig } from './types'
import { fmtErr } from './utils'

const API = API_URL

function SkillCreateForm({ onCreated }: { onCreated: (skill: SkillConfig) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', content: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!form.name.trim()) {
      setError('名称必填')
      return
    }
    setSaving(true)
    setError('')
    info('ui:settings:skill_create', { name: form.name.trim() })
    try {
      const response = await fetch(`${API}/api/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '创建失败')
      }
      const created = await response.json() as SkillConfig
      onCreated(created)
      setForm({ name: '', description: '', content: '' })
      setOpen(false)
      info('ui:settings:skill_create_success', { name: created.name })
    } catch (error) {
      warn('ui:settings:skill_create_failed', { name: form.name.trim(), error })
      setError(fmtErr(error, '创建失败'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 text-[13px] font-bold text-ink-soft border border-dashed border-line rounded-xl hover:border-accent/50 hover:text-accent transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" aria-hidden />
        手动创建
      </button>
    )
  }

  return (
    <div className="settings-surface rounded-xl p-5 space-y-3">
      <p className="text-[13px] font-bold text-ink flex items-center gap-1.5">
        <BrainCircuit className="w-4 h-4 text-accent" aria-hidden />
        手动创建 Skill
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-ink-soft uppercase mb-1.5">名称</label>
          <input
            value={form.name}
            onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))}
            placeholder="request-review"
            className="w-full settings-input rounded-xl px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-ink-soft uppercase mb-1.5">描述</label>
          <input
            value={form.description}
            onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))}
            placeholder="什么时候该使用这个 skill"
            className="w-full settings-input rounded-xl px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-ink-soft uppercase mb-1.5">SKILL.md</label>
        <textarea
          value={form.content}
          onChange={event => setForm(previous => ({ ...previous, content: event.target.value }))}
          rows={8}
          placeholder="留空则自动生成基础模板"
          className="w-full settings-input rounded-xl px-3 py-2 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none font-mono"
        />
      </div>
      {error && <p className="tone-danger-panel rounded-xl border px-3 py-1.5 text-[12px]">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-1.5 text-[12px] text-ink-soft hover:text-ink hover:bg-surface-muted rounded-xl transition-colors">取消</button>
        <button type="button" onClick={handleCreate} disabled={saving} className="px-4 py-1.5 text-[12px] font-bold bg-accent text-on-accent rounded-xl hover:bg-accent-deep disabled:opacity-50 transition-all flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" aria-hidden />
          {saving ? '创建中…' : '创建'}
        </button>
      </div>
    </div>
  )
}

function SkillImportForm({ onImported }: { onImported: (skill: SkillConfig) => void }) {
  const [open, setOpen] = useState(false)
  const [sourcePath, setSourcePath] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleImport() {
    if (!sourcePath.trim()) {
      setError('请选择一个 skill 文件夹')
      return
    }
    setSaving(true)
    setError('')
    info('ui:settings:skill_import', { sourcePath: sourcePath.trim() })
    try {
      const response = await fetch(`${API}/api/skills/import-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath: sourcePath.trim() }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || '导入失败')
      }
      const imported = await response.json() as SkillConfig
      onImported(imported)
      setSourcePath('')
      setOpen(false)
      info('ui:settings:skill_import_success', { name: imported.name, sourcePath: sourcePath.trim() })
    } catch (error) {
      warn('ui:settings:skill_import_failed', { sourcePath: sourcePath.trim(), error })
      setError(fmtErr(error, '导入失败'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 text-[13px] font-bold text-ink-soft border border-dashed border-line rounded-xl hover:border-accent/50 hover:text-accent transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" aria-hidden />
        导入文件夹
      </button>
    )
  }

  return (
    <div className="settings-surface rounded-xl p-5 space-y-3">
      <p className="text-[13px] font-bold text-ink flex items-center gap-1.5">
        <Plus className="w-4 h-4 text-accent" aria-hidden />
        导入 Skill 文件夹
      </p>
      <DirectoryPicker
        value={sourcePath}
        onChange={setSourcePath}
        inputLabel="Skill 文件夹路径"
        placeholder="/Users/.../my-skill"
      />
      <p className="text-[11px] text-ink-soft">选择包含 `SKILL.md` 的 skill bundle 目录，系统会把整个文件夹导入为 managed skill。</p>
      {error && <p className="tone-danger-panel rounded-xl border px-3 py-1.5 text-[12px]">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-1.5 text-[12px] text-ink-soft hover:text-ink hover:bg-surface-muted rounded-xl transition-colors">取消</button>
        <button type="button" onClick={handleImport} disabled={saving} className="px-4 py-1.5 text-[12px] font-bold bg-accent text-on-accent rounded-xl hover:bg-accent-deep disabled:opacity-50 transition-all flex items-center gap-1.5">
          <Save className="w-3.5 h-3.5" aria-hidden />
          {saving ? '导入中…' : '导入'}
        </button>
      </div>
    </div>
  )
}

function SkillRow({
  skill,
  onUpdate,
  onDelete,
}: {
  skill: SkillConfig
  onUpdate: (skill: SkillConfig) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    description: skill.description,
    content: skill.content,
    enabled: skill.enabled,
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!editing) {
      setForm({
        description: skill.description,
        content: skill.content,
        enabled: skill.enabled,
      })
    }
  }, [editing, skill])

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const response = await fetch(`${API}/api/skills/${encodeURIComponent(skill.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '保存失败')
      }
      const updated = await response.json() as SkillConfig
      onUpdate(updated)
      setEditing(false)
      info('ui:settings:skill_saved', { name: skill.name, enabled: updated.enabled })
    } catch (error) {
      warn('ui:settings:skill_save_failed', { name: skill.name, error })
      setSaveError(fmtErr(error, '保存失败'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const response = await fetch(`${API}/api/skills/${encodeURIComponent(skill.name)}`, { method: 'DELETE' })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || '删除失败')
      }
      onDelete(skill.id)
      info('ui:settings:skill_deleted', { name: skill.name })
    } catch (error) {
      warn('ui:settings:skill_delete_failed', { name: skill.name, error })
      alert(fmtErr(error, '删除失败'))
      setDeleting(false)
    }
  }

  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="max-w-full truncate font-display text-[28px] font-bold leading-tight text-ink">{skill.name}</h2>
            <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">managed</span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${skill.enabled ? 'tone-success-pill' : 'bg-surface-muted text-ink-soft'}`}>
              {skill.enabled ? '已启用' : '已停用'}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] leading-6 text-ink-soft">{skill.description || '无描述'}</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-[12px] font-bold text-ink transition-colors hover:bg-surface-muted"
          >
            <Edit2 className="h-3.5 w-3.5" aria-hidden />
            编辑
          </button>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">描述</label>
          {editing ? (
            <textarea
              value={form.description}
              onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))}
              rows={2}
              className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] leading-6 text-ink focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          ) : (
            <p className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] leading-6 text-ink">{skill.description || '无描述'}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">SKILL.md</label>
          {editing ? (
            <textarea
              value={form.content}
              onChange={event => setForm(previous => ({ ...previous, content: event.target.value }))}
              rows={14}
              className="w-full resize-y rounded-lg border border-line bg-ink px-3 py-3 font-mono text-[12px] leading-6 text-bg focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          ) : (
            <div className="max-h-[22rem] overflow-y-auto rounded-lg bg-ink px-4 py-3 font-mono text-[11.5px] leading-6 text-bg custom-scrollbar">
              <p className="whitespace-pre-wrap">{skill.content || '# empty skill'}</p>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,18rem)_1fr]">
          <div>
            <p className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">启用状态</p>
            <label className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] text-ink">
              <input
                type="checkbox"
                checked={editing ? form.enabled : skill.enabled}
                disabled={!editing}
                onChange={event => setForm(previous => ({ ...previous, enabled: event.target.checked }))}
                className="accent-accent"
              />
              {editing ? (form.enabled ? '已启用' : '已停用') : (skill.enabled ? '已启用' : '已停用')}
              <span className="text-ink-faint">· {skill.usage.agentCount} 个成员引用</span>
            </label>
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">使用情况</p>
            <p className="rounded-lg border border-line bg-surface px-3 py-2 text-[12px] text-ink-soft">
              Agent {skill.usage.agentCount} / Room {skill.usage.roomCount}
            </p>
          </div>
        </div>
      </div>

      {saveError && <p className="tone-danger-panel mt-3 rounded-xl border px-3 py-1.5 text-[12px]">{saveError}</p>}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="tone-danger-icon inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line px-3 text-[12px] font-bold"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
          删除 Skill
        </button>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-[12px] font-bold text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
              >
                放弃修改
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-[12px] font-bold text-on-accent transition-colors hover:bg-accent-deep disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" aria-hidden />
                {saving ? '保存中…' : '保存'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-ink px-3 text-[12px] font-bold text-bg transition-colors hover:opacity-90"
            >
              编辑 Skill
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function managedSkillKey(skill: SkillConfig): string {
  return `managed:${skill.id}`
}

function globalSkillKey(skill: ReadOnlySkill): string {
  return `global:${skill.sourcePath}:${skill.name}`
}

function GlobalSkillDetail({ skill }: { skill: ReadOnlySkill }) {
  return (
    <section className="min-w-0">
      <div className="border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="max-w-full truncate font-display text-[28px] font-bold leading-tight text-ink">{skill.name}</h2>
          <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-soft">{skill.sourceType}</span>
          <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-bold text-ink-soft">只读</span>
        </div>
        <p className="mt-1 text-[12.5px] leading-6 text-ink-soft">{skill.description || '无描述'}</p>
      </div>
      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">描述</p>
          <p className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] leading-6 text-ink">{skill.description || '无描述'}</p>
        </div>
        <div>
          <p className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">sourcePath</p>
          <p className="break-all rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-[12px] text-ink-soft">{skill.sourcePath}</p>
        </div>
        <div>
          <p className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">SKILL.md</p>
          <div className="rounded-lg bg-ink px-4 py-3 font-mono text-[11.5px] leading-6 text-bg">
            <p># {skill.name}</p>
            <p className="text-bg/70">{skill.description || 'Read-only global skill'}</p>
            <p className="mt-2 text-bg/45">// managed by {skill.sourceType}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function SkillSettingsTab({
  skills,
  globalSkills,
  onCreated,
  onImported,
  onUpdate,
  onDelete,
}: {
  skills: SkillConfig[]
  globalSkills: ReadOnlySkill[]
  onCreated: (skill: SkillConfig) => void
  onImported: (skill: SkillConfig) => void
  onUpdate: (skill: SkillConfig) => void
  onDelete: (id: string) => void
}) {
  const [selectedSkillKey, setSelectedSkillKey] = useState('')
  const firstSkillKey = skills[0] ? managedSkillKey(skills[0]) : (globalSkills[0] ? globalSkillKey(globalSkills[0]) : '')

  useEffect(() => {
    const stillExists = skills.some(skill => managedSkillKey(skill) === selectedSkillKey)
      || globalSkills.some(skill => globalSkillKey(skill) === selectedSkillKey)
    if (!selectedSkillKey || !stillExists) setSelectedSkillKey(firstSkillKey)
  }, [firstSkillKey, globalSkills, selectedSkillKey, skills])

  const selectedManagedSkill = skills.find(skill => managedSkillKey(skill) === selectedSkillKey)
  const selectedGlobalSkill = globalSkills.find(skill => globalSkillKey(skill) === selectedSkillKey)

  return (
    <div className="grid h-full min-h-0 overflow-hidden bg-surface lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-bg p-3 lg:border-b-0 lg:border-r">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Managed · {skills.length}</p>
          <BrainCircuit className="h-4 w-4 text-ink-faint" aria-hidden />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <SkillImportForm onImported={onImported} />
          <SkillCreateForm onCreated={onCreated} />
        </div>
        <div className="mt-3 space-y-1">
          {skills.length === 0 ? (
            <p className="px-2 py-3 text-[12px] text-ink-soft">还没有 managed skills。创建后就可以给 Agent 和 Room 绑定。</p>
          ) : skills.map(skill => {
            const selected = selectedSkillKey === managedSkillKey(skill)
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => setSelectedSkillKey(managedSkillKey(skill))}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  selected ? 'border-accent/25 bg-surface text-ink shadow-sm' : 'border-transparent text-ink-soft hover:border-line hover:bg-surface hover:text-ink'
                } ${skill.enabled ? '' : 'opacity-60'}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${skill.enabled ? 'bg-accent' : 'bg-ink-faint'}`} />
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{skill.name}</span>
                <span className="shrink-0 rounded-full border border-line bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-ink-faint">
                  {skill.enabled ? 'on' : 'off'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 px-1 pb-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Global · {globalSkills.length}</div>
        <div className="space-y-1">
          {globalSkills.length === 0 ? (
            <p className="px-2 py-3 text-[12px] text-ink-soft">当前没有发现全局 skills。</p>
          ) : globalSkills.map(skill => {
            const selected = selectedSkillKey === globalSkillKey(skill)
            return (
              <button
                key={`${skill.name}:${skill.sourcePath}`}
                type="button"
                onClick={() => setSelectedSkillKey(globalSkillKey(skill))}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  selected ? 'border-accent/25 bg-surface text-ink shadow-sm' : 'border-transparent text-ink-soft hover:border-line hover:bg-surface hover:text-ink'
                }`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-ink-faint" />
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{skill.name}</span>
                <span className="shrink-0 rounded-full border border-line bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-faint">
                  {skill.sourceType}
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="min-w-0 overflow-y-auto p-6 custom-scrollbar lg:p-8">
        {selectedManagedSkill ? (
          <SkillRow key={selectedManagedSkill.id} skill={selectedManagedSkill} onUpdate={onUpdate} onDelete={onDelete} />
        ) : selectedGlobalSkill ? (
          <GlobalSkillDetail skill={selectedGlobalSkill} />
        ) : (
          <div className="rounded-xl border border-line bg-surface-muted p-5 text-[13px] text-ink-soft">请选择一个 Skill。</div>
        )}
      </section>
    </div>
  )
}
