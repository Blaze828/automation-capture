import * as fs from 'fs/promises';
import * as path from 'path';

export interface BundledRuntime { node: string; python: string; target: string; }
let prepared: BundledRuntime | undefined;
export const getBundledRuntime = (): BundledRuntime | undefined => prepared;

export async function prepareBundledRuntime(extensionPath: string, required = true,
  platform: NodeJS.Platform = process.platform, architecture: string = process.arch): Promise<BundledRuntime | undefined> {
  const root = path.join(extensionPath, 'runtime', 'bundled');
  let data: { schema: number; target: string; node: string; python: string };
  try { data = JSON.parse(await fs.readFile(path.join(root, 'runtime.json'), 'utf8')); }
  catch (error) {
    if (!required && (error as NodeJS.ErrnoException).code === 'ENOENT') { prepared = undefined; return undefined; }
    throw new Error('확장의 실행 도구를 찾지 못했습니다. 최신 VSIX 파일을 다시 설치하세요.');
  }
  const target = `${platform}-${architecture}`;
  if (data.schema !== 1 || data.target !== target || !['win32-x64', 'darwin-arm64', 'darwin-x64'].includes(target)) {
    throw new Error('컴퓨터 종류에 맞는 확장 파일을 설치하세요. Windows / Mac M시리즈 / Mac Intel을 확인하세요.');
  }
  const resolve = (relative: string): string => {
    if (typeof relative !== 'string' || path.isAbsolute(relative)) { throw new Error('올바르지 않은 실행 도구 경로입니다.'); }
    const result = path.resolve(root, relative);
    if (!result.startsWith(path.resolve(root) + path.sep)) { throw new Error('올바르지 않은 실행 도구 경로입니다.'); }
    return result;
  };
  const node = resolve(data.node), python = resolve(data.python);
  for (const executable of [node, python]) {
    if (!(await fs.stat(executable)).isFile()) { throw new Error('실행 도구가 손상되었습니다. 최신 VSIX를 다시 설치하세요.'); }
    // ZIP extractors can discard Unix executable bits; restore them without an installer.
    if (platform === 'darwin') { await fs.chmod(executable, 0o755); }
  }
  prepared = { node, python, target };
  return prepared;
}

export function terminalNodeEnvironment(node: string): { PATH?: string } {
  return path.isAbsolute(node) ? { PATH: path.dirname(node) + path.delimiter + (process.env.PATH || '') } : {};
}
