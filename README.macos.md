# Mac 설치·사용 안내

macOS 13 이상과 데스크톱 VS Code 1.100 이상을 사용합니다. VSIX 하나에 Node.js, Python, 캡처 도구가 포함됩니다.

[전체 사용법](README.md) · [Windows 안내](README.windows.md)

## 설치와 업데이트

**Apple 메뉴 → 이 Mac에 관하여**에서 칩 또는 프로세서를 확인합니다.

| 실행 환경 | VSIX 다운로드 |
|---|---|
| Apple Silicon용 VS Code | [Apple Silicon용 VSIX](https://github.com/Blaze828/automation-capture/releases/download/v0.8.0/js-assignment-autocapture-0.8.0-darwin-arm64.vsix) |
| Intel용 VS Code · Rosetta로 실행하는 Intel용 VS Code 포함 | [Intel Mac용 VSIX](https://github.com/Blaze828/automation-capture/releases/download/v0.8.0/js-assignment-autocapture-0.8.0-darwin-x64.vsix) |

1. 표에서 내 Mac에 맞는 VSIX를 받습니다. 단일 실행과 폴더 일괄 실행이 함께 들어 있습니다.
2. VS Code 왼쪽의 **확장 → ⋯ → VSIX에서 설치…**에서 파일을 선택합니다.
3. **다시 로드** 안내가 나오면 누릅니다.

## 첫 캡처 때 Mac 권한 허용

권한 안내가 나오면 **시스템 설정 → 개인정보 보호 및 보안**에서 안내에 표시된 앱(VS Code 또는 Python)을 허용합니다.

| 권한 | 쓰는 곳 |
|---|---|
| **화면 기록** 또는 **화면 및 시스템 오디오 기록** | 실제 VS Code 창 캡처 |
| **손쉬운 사용** | 터미널 높이 조절, REPL 출력 영역 확인 |

권한을 변경한 뒤 VS Code를 **완전히 종료하고 다시 실행**합니다.

## 자주 쓰는 단축키

Mac의 **Control은 ⌃**, **Option은 ⌥**입니다.

| 할 일 | 단축키 | 사용 방법 |
|---|---|---|
| 한 파일 실행 | `Control+Option+Q` | 과제 폴더를 열고 실행할 `.js` 탭을 선택합니다. |
| 폴더 일괄 실행 | `Control+Option+Shift+B` | 실행할 원본 폴더를 고릅니다. 바로 아래의 `.js` 파일을 이름순으로 처리합니다. |
| 실행 중단 | `Control+Option+X` | 실행 중에 누릅니다. 이미 저장한 결과는 그대로 사용할 수 있습니다. |
| 저장 폴더 선택 | `Control+Option+S` | `제출` 같은 상위 폴더를 고릅니다. 상태 표시줄의 **저장 폴더** 버튼으로도 열 수 있습니다. |
| 이미지 형식 변경 | `Control+Option+F` | PNG·JPG·WebP 중 고릅니다. |

저장 위치와 형식을 아직 정하지 않았다면 첫 실행에서 물어봅니다. 촬영이 끝날 때까지 VS Code 창을 전면에 두세요.

일괄 실행이 끝나면 저장된 JS와 캡처 이미지가 있는 결과 폴더를 Finder에서 엽니다. Finder에서 같은 경로를 확인할 수 있으면 기존 창을 그대로 두고, 그 외에는 Finder의 기본 열기 동작을 사용합니다. 문제가 생겼을 때는 VS Code 알림의 **문제 보기**를 눌러 **출력 → Assignment 실행 문제**에서 원인을 확인합니다. [일괄 실행 안내](README.md#폴더의-javascript-파일-일괄-실행)

## 잘 안될 때

- 단축키가 동작하지 않으면 `Command+Shift+P`에서 `Assignment: Run and Capture` 또는 `Assignment: Run Folder and Capture`를 실행합니다.
- 권한 오류가 나오면 화면 기록과 손쉬운 사용 권한을 확인하고 VS Code를 완전히 종료한 뒤 다시 엽니다.
- Python 모듈 오류가 나오면 Mac 아키텍처에 맞는 VSIX를 다시 설치하고 VS Code 설정에서 `assignment.useBundledRuntime`이 켜져 있는지 확인합니다.

[전체 단축키](README.md#자주-쓰는-단축키) · [저장 위치와 ZIP 제출](README.md#결과-저장과-zip-제출) · [문제 해결](README.md#문제-해결)
