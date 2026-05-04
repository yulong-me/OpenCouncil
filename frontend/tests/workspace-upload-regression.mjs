import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspaceFilesPanel = readFileSync(resolve(root, 'components/WorkspaceFilesPanel.tsx'), 'utf8')
const workspaceLib = readFileSync(resolve(root, 'lib/workspace.ts'), 'utf8')

assert.match(workspaceFilesPanel, /Upload/)
assert.match(workspaceFilesPanel, /type="file"/)
assert.match(workspaceFilesPanel, /uploadWorkspaceFile\(workspacePath,\s*currentPath,\s*file\)/)
assert.match(workspaceFilesPanel, /isWorkspaceRequestError\(err,\s*409\)/)
assert.match(workspaceFilesPanel, /setPendingOverwrite\(\{ file,\s*parentPath: currentPath \}\)/)
assert.match(workspaceFilesPanel, /文件已存在，要覆盖吗？/)
assert.match(workspaceFilesPanel, /uploadWorkspaceFile\(workspacePath,\s*pendingOverwrite\.parentPath,\s*pendingOverwrite\.file,\s*\{ overwrite: true \}\)/)
assert.match(workspaceFilesPanel, /disabled=\{loading \|\| uploading\}/)
assert.match(workspaceFilesPanel, /已上传/)

assert.match(workspaceLib, /export async function uploadWorkspaceFile/)
assert.match(workspaceLib, /options: \{ overwrite\?: boolean \} = \{\}/)
assert.match(workspaceLib, /\/api\/browse\/upload/)
assert.match(workspaceLib, /workspacePath/)
assert.match(workspaceLib, /parentPath/)
assert.match(workspaceLib, /contentBase64/)
assert.match(workspaceLib, /overwrite: options\.overwrite === true/)
assert.doesNotMatch(workspaceLib, /overwrite:\s*true,/)
assert.match(workspaceLib, /class WorkspaceRequestError extends Error/)
assert.match(workspaceLib, /export function isWorkspaceRequestError/)
assert.match(workspaceLib, /arrayBufferToBase64/)

console.log('workspace-upload-regression: ok')
