import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { createChapterZip } from '../zipArchive';
import { nextAvailable, publishFile } from '../storage';

test('ZIP contains only JS/PNG, preserves Korean names, is valid and safely replaces old ZIP', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), '제출 공백 '));
  try {
    const chapter = path.join(root, '4장'); await fs.mkdir(chapter);
    await fs.writeFile(path.join(chapter, '한글 과제.js'), "console.log('안녕');");
    await fs.writeFile(path.join(chapter, '한글 과제 실행결과.png'), Buffer.from([137, 80, 78, 71]));
    await fs.writeFile(path.join(chapter, '.ignore.tmp'), 'not a submission');
    await fs.mkdir(path.join(chapter, 'not-a-file.js'));
    const zip = path.join(root, '4장.zip');
    assert.equal(await createChapterZip(chapter, zip, false), 2);
    const inspect = () => JSON.parse(execFileSync(process.env.AUTOCAPTURE_PYTHON || 'python', ['-c',
      'import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps({n:z.read(n).hex() for n in z.namelist()}))', zip], { encoding: 'utf8' }));
    const contents = inspect();
    assert.deepEqual(Object.keys(contents).sort(), ['한글 과제.js', '한글 과제 실행결과.png'].sort());
    assert.equal(Buffer.from(contents['한글 과제.js'], 'hex').toString(), "console.log('안녕');");
    const first = await fs.readFile(zip);
    await assert.rejects(createChapterZip(chapter, zip, false), { code: 'EEXIST' });
    assert.deepEqual(await fs.readFile(zip), first);
    await fs.writeFile(path.join(chapter, '추가.js'), 'console.log(2)');
    assert.equal(await createChapterZip(chapter, zip, true), 3);
    assert.equal(Object.keys(inspect()).length, 3);
    assert.equal(await fs.readFile(path.join(chapter, '추가.js'), 'utf8'), 'console.log(2)');
    assert.ok(!(await fs.readdir(root)).some(n => n.endsWith('.tmp')));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
test('exclusive publishing and numbering preserve previous submissions', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'autocapture-storage-'));
  try {
    const target = path.join(root, '131 실행결과.png'); const temp = path.join(root, '.temp.png');
    await fs.writeFile(target, 'previous'); await fs.writeFile(temp, 'new');
    await assert.rejects(publishFile(temp, target, false), { code: 'EEXIST' });
    assert.equal(await fs.readFile(target, 'utf8'), 'previous');
    const next = await nextAvailable(target); assert.equal(path.basename(next), '131 실행결과_02.png');
    await publishFile(temp, next, false);
    assert.equal(path.basename(await nextAvailable(target)), '131 실행결과_03.png');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
test('a nonexistent window never creates a PNG', { skip: process.platform !== 'win32' }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'autocapture-window-'));
  try {
    const output = path.join(root, 'must-not-exist.png');
    assert.throws(() => execFileSync(process.env.AUTOCAPTURE_PYTHON || 'python', [path.resolve('python/capture.py'), '--hwnd', '2147483646', '--pid', '1', '--output', output], { stdio: 'pipe' }));
    await assert.rejects(fs.stat(output), { code: 'ENOENT' });
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
