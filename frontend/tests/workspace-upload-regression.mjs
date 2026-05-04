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
assert.match(workspaceFilesPanel, /disabled=\{loading \|\| uploading\}/)
assert.match(workspaceFilesPanel, /已上传/)

assert.match(workspaceLib, /export async function uploadWorkspaceFile/)
assert.match(workspaceLib, /\/api\/browse\/upload/)
assert.match(workspaceLib, /workspacePath/)
assert.match(workspaceLib, /parentPath/)
assert.match(workspaceLib, /contentBase64/)
assert.match(workspaceLib, /arrayBufferToBase64/)

console.log('workspace-upload-regression: ok')
