# JS Assignment AutoCapture

VS Code에서 JavaScript 과제를 실행하고, 제출할 **JS 복사본과 실행 화면**을 저장합니다. 파일 하나를 실행하거나 폴더의 `.js` 파일을 순서대로 처리할 수 있습니다.

[설치](#설치) · [자주 쓰는 단축키](#자주-쓰는-단축키) · [한 파일 실행](#javascript-한-파일-실행) · [폴더 일괄 실행](#폴더의-javascript-파일-일괄-실행) · [저장과 ZIP](#결과-저장과-zip-제출) · [문제 해결](#문제-해결)

## 설치

로컬 데스크톱 **VS Code 1.100 이상**에서 사용합니다. VSIX에는 Node.js와 Python, 캡처 도구가 포함됩니다.

| 환경 | VSIX 다운로드 | 설치 안내 |
|---|---|---|
| Windows 10/11 x64 | [Windows용 VSIX](https://github.com/Blaze828/automation-capture/releases/download/v0.8.0/js-assignment-autocapture-0.8.0-win32-x64.vsix) | [Windows 안내](README.windows.md) |
| macOS 13 이상 · Apple Silicon | [Apple Silicon용 VSIX](https://github.com/Blaze828/automation-capture/releases/download/v0.8.0/js-assignment-autocapture-0.8.0-darwin-arm64.vsix) | [Mac 안내](README.macos.md) |
| macOS 13 이상 · Intel | [Intel Mac용 VSIX](https://github.com/Blaze828/automation-capture/releases/download/v0.8.0/js-assignment-autocapture-0.8.0-darwin-x64.vsix) | [Mac 안내](README.macos.md) |

**단일 실행과 폴더 일괄 실행이 같은 VSIX에 들어 있습니다.** 사용 중인 운영체제에 맞는 파일 하나를 받으세요. [GitHub 릴리스](https://github.com/Blaze828/automation-capture/releases/latest)

1. VS Code 왼쪽의 **확장**을 엽니다.
2. 상단 **⋯ → VSIX에서 설치…**를 눌러 `.vsix` 파일을 선택합니다. 업데이트도 같은 순서로 설치합니다.
3. **다시 로드** 안내가 나오면 누릅니다. Mac은 첫 캡처 때 시스템 권한을 허용합니다. [Mac 권한 안내](README.macos.md#첫-캡처-때-mac-권한-허용)

## 처음 한 번 설정

1. VS Code에서 **파일 → 폴더 열기**로 신뢰하는 과제 폴더를 엽니다.
2. 아래 상태 표시줄의 **저장 폴더 선택**을 누르고 `제출` 같은 상위 폴더를 고릅니다. 장별 하위 폴더는 자동으로 만들어집니다.
3. 첫 캡처에서 **PNG·JPG·WebP** 중 하나를 고릅니다. 저장 폴더를 아직 고르지 않았다면 첫 실행에서 함께 선택할 수 있습니다.

저장 폴더와 이미지 형식은 같은 작업 영역에서 다시 사용됩니다. 상태 표시줄의 **저장 폴더: …**를 누르면 위치를 바꿀 수 있고, 마우스를 올리면 전체 경로가 표시됩니다.

## 자주 쓰는 단축키

| 할 일 | Windows | Mac | 명령 팔레트 |
|---|---|---|---|
| 한 파일 실행·캡처 | `Ctrl+Alt+Q` | `Control+Option+Q` | `Assignment: Run and Capture` |
| **폴더 일괄 실행·캡처** | **`Ctrl+Alt+Shift+B`** | **`Control+Option+Shift+B`** | `Assignment: Run Folder and Capture` |
| 실행 중단 | `Ctrl+Alt+X` | `Control+Option+X` | `Assignment: Stop Run` |
| 저장 폴더 선택 | `Ctrl+Alt+S` | `Control+Option+S` | `Assignment: Select Output Folder` |
| 이미지 형식 변경 | `Ctrl+Alt+F` | `Control+Option+F` | `Assignment: Select Image Format` |
| 현재 화면 추가 캡처 | `Ctrl+Alt+W` | `Control+Option+W` | `Assignment: Capture Again` |
| 직접 분할 캡처 | `Ctrl+Alt+A` | `Control+Option+A` | `Assignment: Capture Multiple Pages` |
| REPL 시작 | `Ctrl+Alt+E` | `Control+Option+E` | `Assignment: Start REPL` |
| REPL 출력 캡처 | `Ctrl+Alt+D` | `Control+Option+D` | `Assignment: Capture REPL` |

명령 팔레트는 Windows에서 `Ctrl+Shift+P`, Mac에서 `Command+Shift+P`로 엽니다. 단축키를 바꾸려면 VS Code의 **바로 가기 키 설정**에서 `Assignment`를 검색하세요.

## JavaScript 한 파일 실행

1. 실행할 `.js` 파일을 편집기에서 엽니다.
2. **Windows `Ctrl+Alt+Q` / Mac `Control+Option+Q`**를 누릅니다. 편집기 오른쪽 위의 카메라 아이콘이나 상태 표시줄의 **Assignment**를 눌러도 됩니다.
3. 캡처가 끝날 때까지 VS Code 창을 전면에 둡니다. 저장 알림의 **폴더 열기**를 누르면 결과를 확인할 수 있습니다.

수정 중인 JS는 실행 직전에 저장됩니다. 프로그램은 원본 파일이 있는 폴더에서 실행하므로 상대 경로도 그 폴더를 기준으로 해석됩니다. 화면에는 VS Code의 파일 탭, 탐색기에서 선택한 파일, 터미널 출력이 함께 담깁니다. 출력이 넘치면 터미널 높이를 조절하고, 그래도 한 화면에 담기 어려우면 여러 장으로 저장합니다.

입력을 기다리는 프로그램은 터미널에 직접 입력하세요. 기본 제한 시간은 **30초**입니다. 단일 실행에서는 시간이 지난 뒤 **계속 실행·중단·수동 캡처**를 선택할 수 있습니다. 반복 출력이 감지되면 실행을 중단하고 대표 화면을 저장합니다.

## 폴더의 JavaScript 파일 일괄 실행

1. **Windows `Ctrl+Alt+Shift+B` / Mac `Control+Option+Shift+B`**를 누릅니다. 명령 팔레트에서는 `Assignment: Run Folder and Capture`를 검색합니다.
2. **실행할 원본 폴더**를 고릅니다. 예를 들어 `과제/6장`을 고르면 바로 아래의 `.js` 파일을 이름순으로 실행합니다. 숫자가 있는 이름은 `2.js`, `10.js` 순으로 처리합니다.
3. VS Code를 전면에 둔 채 기다립니다. 상태 표시줄에서 진행 중인 파일을 확인할 수 있습니다.

실행 범위는 선택한 폴더의 최상위 `.js` 파일입니다. 파일마다 실행과 캡처가 끝난 뒤 다음 파일로 넘어갑니다. 긴 출력은 여러 장으로 저장하며, 기존 파일과 이름이 겹치면 새 번호를 붙입니다. 제한 시간 안에 끝나지 않은 파일은 실행을 중단해 대표 화면을 저장한 뒤 다음 파일을 처리합니다.

일괄 실행을 중단하려면 **Windows `Ctrl+Alt+X` / Mac `Control+Option+X`**를 누릅니다. 이미 저장한 파일은 그대로 사용할 수 있습니다.

### 완료 후 결과와 문제 확인

- **결과 폴더**는 일괄 실행이 끝나고 저장된 캡처가 있으면 자동으로 열립니다. Windows 탐색기에 같은 경로가 열려 있으면 기존 창이나 탭을 그대로 둡니다. Mac에서는 열린 경로를 확인할 수 있으면 그대로 두고, 그 외에는 Finder의 기본 열기 동작을 사용합니다.
- **알림**은 실행 오류, 경고, 시간 초과, 출력 잘림, 저장·캡처 실패 등 확인할 문제가 있을 때 한 번 표시됩니다.
- **문제 보기**를 누르면 VS Code 아래쪽 **출력 → Assignment 실행 문제**가 열립니다. 파일별 원인과 오류 메시지, 확인 가능한 원본 줄 번호가 표시됩니다. 결과 폴더에 저장되는 제출 파일은 JS 복사본과 캡처 이미지입니다.

## 결과 저장과 ZIP 제출

저장 폴더 아래에 원본 파일의 상위 폴더 이름으로 하위 폴더를 만듭니다. 예를 들어 `과제/6장/test.js`를 실행하고 저장 위치로 `제출`을 선택하면 다음과 같이 저장됩니다.

```text
제출/
└─ 6장/
   ├─ test.js
   └─ test 실행결과.png
```

추가 캡처나 분할 이미지에는 `_02`, `_03`처럼 번호가 붙습니다. REPL 화면은 `test REPL.png`처럼 저장됩니다. 이미지 확장자는 선택한 형식에 따라 달라집니다. 단일 파일 실행에서 기존 결과와 이름이 겹치면 **덮어쓰기·새 버전으로 저장·취소** 중 선택합니다.

- **저장 위치 확인**은 명령 팔레트에서 `Assignment: Open Output Folder`를 실행합니다.
- **ZIP 제출**은 `Assignment: Export Chapter ZIP`을 실행하고 장 폴더를 고릅니다. `6장`을 선택하면 저장 폴더 바로 아래에 `제출/6장.zip`이 생깁니다. ZIP에는 선택한 장의 JS와 PNG·JPG·WebP 이미지가 들어갑니다.

## 추가 캡처와 REPL

- **현재 화면 추가 캡처**는 원하는 코드와 결과를 화면에 표시한 뒤 `W` 단축키로 한 장 더 저장합니다. 이 명령은 화면에 이미 표시된 내용을 사용합니다.
- **직접 분할 캡처**는 `A` 단축키를 누른 뒤 **코드와 실행 결과·코드만·실행 결과만** 중 선택합니다. 결과를 포함하려면 같은 JS 파일을 먼저 실행하세요.
- **REPL**에서는 관련 `.js` 탭을 열고 `E` 단축키를 누릅니다. `Assignment REPL` 터미널에 `1 + 2` 같은 코드를 한 줄씩 입력한 뒤 `D` 단축키로 터미널 출력 영역을 저장합니다. 캡처 후에도 같은 세션에서 변수를 계속 쓸 수 있습니다.

## 문제 해결

| 증상 | 확인할 항목 |
|---|---|
| 폴더 일괄 실행 명령이 보이지 않음 | `v0.8.0` 이상 VSIX를 설치한 뒤 명령 팔레트에서 `Assignment: Run Folder and Capture`를 검색합니다. [설치 안내](#설치) |
| 선택한 폴더에서 실행할 파일이 없다고 나옴 | `.js` 파일이 바로 들어 있는 원본 폴더를 선택합니다. |
| 단축키가 동작하지 않음 | 명령 팔레트에서 같은 명령을 실행하고 **바로 가기 키 설정**에서 충돌을 확인합니다. |
| 작업 영역이 제한 모드임 | 신뢰하는 과제 폴더인지 확인한 뒤 작업 영역 신뢰를 허용합니다. |
| JS만 저장되고 캡처가 실패함 | 오류 원인을 확인하고 VS Code를 전면에 둡니다. 올바른 실행 화면이 이미 열려 있다면 **현재 화면 추가 캡처**로 다시 찍을 수 있습니다. |
| VS Code 창의 파일 이름을 찾지 못함 | 원본 `.js` 탭을 선택합니다. `window.title`을 직접 설정했다면 `${activeEditorShort}`가 포함되어 있는지 확인합니다. |
| Mac 캡처 권한 오류 | 화면 기록과 손쉬운 사용 권한을 확인한 뒤 VS Code를 완전히 종료하고 다시 엽니다. [Mac 권한 안내](README.macos.md#첫-캡처-때-mac-권한-허용) |
| 출력이 너무 길어 잘림 | 출력 보관 한도는 1,000,000자입니다. 전체 출력이 필요하면 프로그램의 출력량을 줄여 다시 실행합니다. |

VS Code 설정에서 `assignment`를 검색하면 실행 제한 시간(`assignment.timeoutSeconds`, 기본 30초), 화면 안정화 대기 시간(`assignment.captureDelayMs`, 기본 800ms), 포함된 실행 환경 사용 여부(`assignment.useBundledRuntime`)를 확인할 수 있습니다.

사용 범위는 Windows와 macOS의 로컬 데스크톱 VS Code와 로컬 `.js` 파일입니다. 외부 npm 패키지를 불러오는 과제는 프로젝트에 해당 패키지가 설치되어 있어야 합니다.

[소스 빌드·상세 설정](docs/DEVELOPMENT.md) · [검증 기록](TESTING.md) · [MIT 라이선스](LICENSE)
