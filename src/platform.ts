/** Native helpers are selected in one place; a VSIX can be installed on either OS. */
export function nativePlatform(platform: NodeJS.Platform = process.platform) {
  if (platform === 'win32') {
    return { capture: 'python/capture.py', layout: 'runtime/terminal_layout.py',
      bootstrap: 'cmd-bootstrap.cmd', shellName: 'cmd', python: 'python',
      startCommand: '@"%AUTOCAPTURE_BOOTSTRAP%"' };
  }
  if (platform === 'darwin') {
    return { capture: 'python/capture_macos.py', layout: 'runtime/terminal_layout_macos.py',
      bootstrap: 'shell-bootstrap.sh', shellName: 'zsh', python: 'python3',
      startCommand: 'source "$AUTOCAPTURE_BOOTSTRAP"' };
  }
  throw new Error('Windows 또는 macOS의 로컬 데스크톱 VS Code에서 실행하세요.');
}
