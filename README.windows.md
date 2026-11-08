# Windows 설치·사용 안내

Windows 10/11 x64와 데스크톱 VS Code 1.100 이상을 사용합니다. VSIX 하나에 Node.js, Python, 캡처 도구가 포함됩니다.

[전체 사용법](README.md) · [Mac 안내](README.macos.md)

## 설치와 업데이트

1. 공개 배포본을 설치하려면 GitHub 릴리스의 **Assets**에서 이름이 `win32-x64.vsix`로 끝나는 파일을 받습니다. 폴더 일괄 실행을 쓰려면 현재 소스에서 빌드한 Windows용 VSIX를 선택합니다. [배포본과 소스 빌드 안내](README.md#설치)
2. VS Code 왼쪽의 **확장 → ⋯ → VSIX에서 설치…**에서 파일을 선택합니다.
3. **다시 로드** 안내가 나오면 누릅니다.

## 자주 쓰는 단축키

| 할 일 | 단축키 | 사용 방법 |
|---|---|---|
| 한 파일 실행 | `Ctrl+Alt+Q` | 과제 폴더를 열고 실행할 `.js` 탭을 선택합니다. |
| 폴더 일괄 실행 | `Ctrl+Alt+Shift+B` | 실행할 원본 폴더를 고릅니다. 바로 아래의 `.js` 파일을 이름순으로 처리합니다. |
| 실행 중단 | `Ctrl+Alt+X` | 실행 중에 누릅니다. 이미 저장한 결과는 그대로 사용할 수 있습니다. |
| 저장 폴더 선택 | `Ctrl+Alt+S` | `제출` 같은 상위 폴더를 고릅니다. 상태 표시줄의 **저장 폴더** 버튼으로도 열 수 있습니다. |
| 이미지 형식 변경 | `Ctrl+Alt+F` | PNG·JPG·WebP 중 고릅니다. |

저장 위치와 형식을 아직 정하지 않았다면 첫 실행에서 물어봅니다. 촬영이 끝날 때까지 VS Code 창을 전면에 두세요.

일괄 실행이 끝나면 저장된 JS와 캡처 이미지가 있는 결과 폴더를 탐색기에서 엽니다. 같은 경로가 이미 열린 창이나 탭에 있으면 그대로 둡니다. 문제가 생겼을 때는 VS Code 알림의 **문제 보기**를 눌러 **출력 → Assignment 실행 문제**에서 원인을 확인합니다. [일괄 실행 안내](README.md#폴더의-javascript-파일-일괄-실행)

## 잘 안될 때

- 단축키가 동작하지 않으면 `Ctrl+Shift+P`에서 `Assignment: Run and Capture` 또는 `Assignment: Run Folder and Capture`를 실행합니다.
- 캡처가 실패하면 VS Code 창을 전면에 두고 겹친 창이나 대화상자를 닫은 뒤 다시 시도합니다.
- Python 모듈 오류가 나오면 VSIX를 다시 설치하고 VS Code 설정에서 `assignment.useBundledRuntime`이 켜져 있는지 확인합니다.

[전체 단축키](README.md#자주-쓰는-단축키) · [저장 위치와 ZIP 제출](README.md#결과-저장과-zip-제출) · [문제 해결](README.md#문제-해결)
