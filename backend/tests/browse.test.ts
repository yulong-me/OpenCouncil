import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import http from 'node:http';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';

import { browseRouter } from '../src/routes/browse.js';

let server: http.Server;
let serverPort = 0;
const createdPaths: string[] = [];

async function makeHomeTemp(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(homedir(), `${prefix}-`));
  createdPaths.push(dir);
  return dir;
}

async function makeOutsideTemp(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), `${prefix}-`));
  createdPaths.push(dir);
  return dir;
}

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/browse', browseRouter);
  return app;
}

async function reqJson(pathname: string): Promise<{ status: number; data: Record<string, unknown> }> {
  return await new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path: pathname,
      method: 'GET',
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let data: Record<string, unknown> = {};
        try { data = JSON.parse(raw); } catch { /* ignore */ }
        resolve({ status: res.statusCode ?? 0, data });
      });
    });
    req.on('error', (error) => resolve({ status: 0, data: { error: String(error) } }));
    req.end();
  });
}

async function postJson(pathname: string, body: Record<string, unknown>): Promise<{ status: number; data: Record<string, unknown> }> {
  const payload = Buffer.from(JSON.stringify(body), 'utf8');
  return await new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(payload.length),
      },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let data: Record<string, unknown> = {};
        try { data = JSON.parse(raw); } catch { /* ignore */ }
        resolve({ status: res.statusCode ?? 0, data });
      });
    });
    req.on('error', (error) => resolve({ status: 0, data: { error: String(error) } }));
    req.write(payload);
    req.end();
  });
}

async function reqRaw(pathname: string, headers: Record<string, string> = {}): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}> {
  return await new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path: pathname,
      method: 'GET',
      headers,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });
    req.on('error', () => resolve({ status: 0, headers: {}, body: Buffer.alloc(0) }));
    req.end();
  });
}

beforeAll(async () => {
  server = http.createServer(makeApp());
  await new Promise<void>((resolve) => server.listen(0, () => {
    const addr = server.address();
    serverPort = typeof addr === 'object' && addr !== null ? addr.port : 0;
    resolve();
  }));
});

afterEach(async () => {
  await Promise.all(
    createdPaths.splice(0).reverse().map(target =>
      rm(target, { recursive: true, force: true }),
    ),
  );
});

afterAll(() => {
  server.close();
});

describe('browse route security', () => {
  it('allows browsing directories inside home', async () => {
    const dir = await makeHomeTemp('browse-home');

    const result = await reqJson(`/api/browse?path=${encodeURIComponent(dir)}`);

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('current', dir);
  });

  it('allows browsing directories outside home', async () => {
    const dir = await makeOutsideTemp('browse-outside');
    const realDir = await realpath(dir);

    const result = await reqJson(`/api/browse?path=${encodeURIComponent(dir)}`);

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('current', realDir);
  });

  it('lists child directories for an outside-home path', async () => {
    const dir = await makeOutsideTemp('browse-outside-children');
    const childDir = path.join(dir, 'child-folder');
    await mkdir(childDir);
    const realDir = await realpath(dir);
    const realChildDir = await realpath(childDir);

    const result = await reqJson(`/api/browse?path=${encodeURIComponent(dir)}`);

    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({
      current: realDir,
      entries: expect.arrayContaining([
        expect.objectContaining({
          name: 'child-folder',
          path: realChildDir,
          isDirectory: true,
        }),
      ]),
    });
  });

  it('previews text files inside home', async () => {
    const dir = await makeHomeTemp('browse-preview');
    const filePath = path.join(dir, 'notes.txt');
    await writeFile(filePath, 'hello preview\nline 2', 'utf8');

    const result = await reqJson(`/api/browse/file?path=${encodeURIComponent(filePath)}`);

    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({
      path: filePath,
      isBinary: false,
      truncated: false,
      content: 'hello preview\nline 2',
    });
  });

  it('marks binary files as non-previewable', async () => {
    const dir = await makeHomeTemp('browse-binary');
    const filePath = path.join(dir, 'image.bin');
    await writeFile(filePath, Buffer.from([0, 159, 146, 150]));

    const result = await reqJson(`/api/browse/file?path=${encodeURIComponent(filePath)}`);

    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({
      path: filePath,
      isBinary: true,
      content: null,
    });
  });

  it('streams supported media files for in-browser playback', async () => {
    const dir = await makeHomeTemp('browse-media');
    const filePath = path.join(dir, 'final.mp4');
    const content = Buffer.from('fake mp4 payload');
    await writeFile(filePath, content);

    const result = await reqRaw(`/api/browse/media?path=${encodeURIComponent(filePath)}`);

    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toContain('video/mp4');
    expect(result.headers['accept-ranges']).toBe('bytes');
    expect(result.body).toEqual(content);
  });

  it('supports range requests for media playback seeking', async () => {
    const dir = await makeHomeTemp('browse-media-range');
    const filePath = path.join(dir, 'voice.mp3');
    await writeFile(filePath, Buffer.from('0123456789'));

    const result = await reqRaw(
      `/api/browse/media?path=${encodeURIComponent(filePath)}`,
      { Range: 'bytes=2-5' },
    );

    expect(result.status).toBe(206);
    expect(result.headers['content-type']).toContain('audio/mpeg');
    expect(result.headers['content-range']).toBe('bytes 2-5/10');
    expect(result.body.toString()).toBe('2345');
  });

  it('uploads a file into a workspace subdirectory and lists it afterward', async () => {
    const workspace = await makeOutsideTemp('browse-upload-workspace');
    const targetDir = path.join(workspace, 'notes');
    await mkdir(targetDir);
    const realWorkspace = await realpath(workspace);
    const realTargetDir = await realpath(targetDir);

    const result = await postJson('/api/browse/upload', {
      workspacePath: realWorkspace,
      parentPath: realTargetDir,
      filename: 'brief.txt',
      contentBase64: Buffer.from('hello upload\n', 'utf8').toString('base64'),
    });

    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({
      name: 'brief.txt',
      size: 13,
      overwritten: false,
    });
    expect(result.data.path).toBe(path.join(realTargetDir, 'brief.txt'));

    const listing = await reqJson(`/api/browse?path=${encodeURIComponent(realTargetDir)}&includeHidden=1`);
    expect(listing.status).toBe(200);
    expect(listing.data.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'brief.txt',
        path: path.join(realTargetDir, 'brief.txt'),
        isDirectory: false,
      }),
    ]));
  });

  it('rejects duplicate uploads unless overwrite is explicit', async () => {
    const workspace = await makeOutsideTemp('browse-upload-duplicate');
    const realWorkspace = await realpath(workspace);
    const targetPath = path.join(realWorkspace, 'brief.txt');
    await writeFile(targetPath, 'original', 'utf8');

    const duplicate = await postJson('/api/browse/upload', {
      workspacePath: realWorkspace,
      parentPath: realWorkspace,
      filename: 'brief.txt',
      contentBase64: Buffer.from('replacement', 'utf8').toString('base64'),
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.data.error).toBe('文件已存在');
    await expect(readFile(targetPath, 'utf8')).resolves.toBe('original');

    const overwrite = await postJson('/api/browse/upload', {
      workspacePath: realWorkspace,
      parentPath: realWorkspace,
      filename: 'brief.txt',
      contentBase64: Buffer.from('replacement', 'utf8').toString('base64'),
      overwrite: true,
    });

    expect(overwrite.status).toBe(200);
    expect(overwrite.data).toMatchObject({ name: 'brief.txt', overwritten: true });
    await expect(readFile(targetPath, 'utf8')).resolves.toBe('replacement');
  });

  it('rejects uploads when the destination is outside the selected workspace', async () => {
    const workspace = await makeOutsideTemp('browse-upload-root');
    const outside = await makeOutsideTemp('browse-upload-outside');

    const result = await postJson('/api/browse/upload', {
      workspacePath: await realpath(workspace),
      parentPath: await realpath(outside),
      filename: 'escape.txt',
      contentBase64: Buffer.from('nope', 'utf8').toString('base64'),
    });

    expect(result.status).toBe(403);
    expect(result.data.error).toBe('上传目录必须位于当前 workspace 内');
  });

  it('does not overwrite a symlink target outside the selected workspace', async () => {
    const workspace = await makeOutsideTemp('browse-upload-symlink-root');
    const outside = await makeOutsideTemp('browse-upload-symlink-outside');
    const outsideFile = path.join(outside, 'secret.txt');
    const linkPath = path.join(workspace, 'linked.txt');
    await writeFile(outsideFile, 'keep me', 'utf8');
    await symlink(outsideFile, linkPath);

    const result = await postJson('/api/browse/upload', {
      workspacePath: await realpath(workspace),
      parentPath: await realpath(workspace),
      filename: 'linked.txt',
      contentBase64: Buffer.from('overwrite', 'utf8').toString('base64'),
      overwrite: true,
    });

    expect(result.status).toBe(403);
    expect(result.data.error).toBe('不能覆盖符号链接');
    await expect(readFile(outsideFile, 'utf8')).resolves.toBe('keep me');
  });
});
