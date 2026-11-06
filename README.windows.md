# Windows 버전 · JS Assignment AutoCapture 0.6.0

Windows의 실제 CMD에서 JavaScript를 실행하고 VS Code 화면을 제출용 이미지로 저장합니다. **설치 파일은 `js-assignment-autocapture-0.6.0-win32-x64.vsix`입니다.**

[전체 기능·기술 스택](README.md) · [Mac 버전](README.macos.md) · [검증 기록](TESTING.md)

## 필요한 프로그램

- Windows 10/11 x64와 VS Code 데스크톱 1.100 이상
- Node.js 22 이상, Python 3.10 이상
- 소스로 설치한다면 Git

[VS Code](https://code.visualstudio.com/download), [Node.js](https://nodejs.org/en/download), [Python](https://www.python.org/downloads/windows/)을 설치하고 PowerShell을 새로 엽니다.

```powershell
node --version
python --version
```

## 설치

```powershell
git clone https://github.com/Blaze828/automation-capture.git
cd automation-capture
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r python/requirements.txt
npm run package:windows
```

PowerShell 실행 정책 때문에 `npm.ps1` 오류가 나면 `npm` 대신 `npm.cmd`를 사용하세요. 가상 환경의 Activate 스크립트를 실행할 필요는 없습니다.

VS Code에서 **확장 → ⋯ → VSIX에서 설치…**를 선택하고 `dist/js-assignment-autocapture-0.6.0-win32-x64.vsix`를 설치합니다. [Actions](https://github.com/Blaze828/automation-capture/actions)에서 `autocapture-win32-x64` 산출물을 받았다면 VSIX 빌드는 생략할 수 있지만 Python 패키지는 설치해야 합니다.

**Ctrl+Shift+P → Preferences: Open User Settings (JSON)**에서 가상 환경의 Python 절대 경로를 지정합니다. 사용자명과 저장소 위치를 실제 경로로 바꾸세요.

```json
{
  "assignment.pythonPath": "C:/Users/사용자명/automation-capture/.venv/Scripts/python.exe",
  "assignment.nodePath": "node"
}
```

VS Code를 다시 열거나 **개발자: 창 다시 로드**를 실행합니다. 이후에는 이 저장소를 열어 둘 필요 없이 평소 JS 과제 폴더에서 사용하면 됩니다.

## 실행·캡처

1. 과제 폴더를 VS Code에서 열고 실행할 `.js` 파일을 선택합니다.
2. 터미널을 원하는 위치와 높이로 배치합니다.
3. **Ctrl+Alt+Q** 또는 편집기 오른쪽 위 카메라 버튼을 누릅니다.
4. 처음 표시되는 제출 폴더와 이미지 형식을 선택합니다.
5. 실행과 캡처가 끝나면 JS 원본과 이미지가 제출 폴더에 저장됩니다.

자동 실행용 **CMD 하나를 계속 재사용**합니다. 다음 파일을 실행하면 이전 화면과 스크롤 기록을 비우고 새 파일이 있는 폴더에서 실행합니다. 캡처 후에는 같은 CMD 프롬프트로 돌아옵니다. 그 터미널에서 다른 프로그램이 실행 중이면 끝낸 뒤 자동 실행을 사용하세요. 다른 사용자 터미널은 이름이 같아도 가져다 쓰지 않습니다.

일반 캡처에는 탐색기의 선택 파일과 활성 파일 탭을 포함합니다. 출력이 현재 높이에 들어가면 배치를 유지하고 넘칠 때만 한 번 높이를 조절합니다. 더 길면 출력만 분할하며 코드 전체는 함께 제출하는 JS 파일로 확인할 수 있습니다.

## 단축키

| 기능 | 키 |
|---|---|
| 실행·자동 캡처 | Ctrl+Alt+Q |
| 현재 창 추가 캡처 | Ctrl+Alt+W |
| Node REPL 시작 | Ctrl+Alt+E |
| REPL 출력만 캡처 | Ctrl+Alt+D |
| 실행 중단 | Ctrl+Alt+X |
| PNG/JPG/WebP 선택 | Ctrl+Alt+F |
| 수동 분할 캡처 | Ctrl+Alt+A |

수동 CMD 실행 결과는 대상 JS 탭을 선택한 상태에서 **Ctrl+Alt+W**로 찍을 수 있습니다. 재실행하거나 높이를 바꾸지 않습니다. ZIP은 명령 팔레트의 **Assignment: Export Chapter ZIP**에서 만듭니다.

## 설정·문제 해결

| 항목 | 설정·해결 방법 |
|---|---|
| 제출 루트 | `Assignment: Select Output Folder` 또는 `assignment.outputFolder`에 절대 경로 지정 |
| Node를 찾지 못함 | `assignment.nodePath`에 실제 `node.exe` 경로 지정 |
| Python 모듈 오류 | 설정한 Python으로 `-m pip install -r python/requirements.txt` 재실행 |
| 실행 제한 시간 | `assignment.timeoutSeconds`, 기본 30초 |
| 화면 안정화 대기 | `assignment.captureDelayMs`, 기본 800ms |
| 대상 파일명 불일치 | JS 탭 선택, `window.title`의 `${activeEditorShort}` 확인 |
| 다른 창이 겹쳐 캡처 취소 | VS Code를 전면에 놓고 겹친 창·대화상자 닫기 |
| 이미지는 없고 JS만 저장됨 | 오류 원인을 해결한 뒤 Ctrl+Alt+W로 다시 캡처 |

검증 상태는 [공통 README의 검증 표](README.md#검증-상태)와 [TESTING.md](TESTING.md)를 확인하세요. Windows 창 제어는 Win32/DWM, 실제 촬영은 mss/PyGetWindow, 영역 확인은 Windows UI Automation을 사용합니다.
