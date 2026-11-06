# Windows 설치·사용 안내

**VSIX 파일 하나만 설치하면 됩니다. Node.js·Python·캡처 도구가 모두 포함되어 있습니다.** · 0.7.2

[전체 안내](README.md) · [Mac 안내](README.macos.md)

## 처음 설치하기

1. **[Windows용 설치 파일 받기](https://github.com/Blaze828/automation-capture/releases/download/v0.7.2/js-assignment-autocapture-0.7.2-win32-x64.vsix)**를 누릅니다.
2. VS Code에서 **확장 → 위쪽 ⋯ → VSIX에서 설치…**를 누릅니다.
3. 다운로드한 **`.vsix` 파일**을 선택합니다. 다시 로드 안내가 나오면 누릅니다.

Windows 10/11 x64와 [VS Code](https://code.visualstudio.com/download) 1.100 이상을 사용합니다. **설치 명령어나 Python 경로 설정은 필요 없습니다.**

## 실행하기

1. **파일 → 폴더 열기**로 과제 폴더를 엽니다.
2. 실행할 **`.js` 파일**을 클릭합니다.
3. **Ctrl+Alt+Q**를 누릅니다.
4. 저장 폴더와 이미지 형식을 물으면 선택합니다.

실행이 끝나면 **JS 원본과 결과 이미지가 자동 저장**됩니다. 같은 과제 폴더에서는 저장 설정을 기억합니다. 촬영이 끝날 때까지 VS Code 창을 전면에 두세요.

## 저장 폴더 선택·변경

VS Code **맨 아래 `저장 폴더 선택` → 원하는 폴더 → `이 폴더에 저장`** 순서로 누릅니다. 설정 후 버튼에 현재 폴더 이름이 표시되고, 다시 누르면 변경할 수 있습니다. **Ctrl+Alt+S**로 바로 열어도 됩니다.

`제출` 같은 상위 폴더만 고르면 `6장` 등 장별 폴더는 자동으로 만들어집니다. 선택한 위치는 같은 과제 폴더에서 기억합니다. 이 버튼은 **0.7.2 이상**에서 제공됩니다.

## 자주 쓰는 단축키

| 할 일 | 단축키 |
|---|---|
| **실행하고 자동 저장** | **Ctrl+Alt+Q** |
| 현재 화면 한 장 더 저장 | Ctrl+Alt+W |
| PNG / JPG / WebP 변경 | Ctrl+Alt+F |
| **저장 폴더 선택·변경** | **Ctrl+Alt+S** |

<details>
<summary><b>추가 단축키</b></summary>

| 할 일 | 단축키 |
|---|---|
| JS를 한 줄씩 입력하기(REPL 시작) | Ctrl+Alt+E |
| REPL 출력만 저장 | Ctrl+Alt+D |
| 실행 중단 | Ctrl+Alt+X |
| 직접 분할 캡처 | Ctrl+Alt+A |

REPL은 **E로 시작 → JS 입력 → D로 저장** 순서입니다.

</details>

<details>
<summary><b>잘 안될 때</b></summary>

- 단축키가 안 되면 **Ctrl+Shift+P → Assignment: Run and Capture**로 실행하세요.
- 실행 도구 오류가 나면 **0.7.2 이상** 설치 파일인지 확인하고 확장을 다시 로드하세요.
- 다운로드가 안 되면 [릴리스 페이지](https://github.com/Blaze828/automation-capture/releases/latest)의 **Assets**에서 `win32-x64.vsix`로 끝나는 파일을 받으세요.

</details>

[기능 전체 보기](README.md#4-주요-기능) · [저장 위치·ZIP 만들기](README.md#5-결과는-어디에-저장되나요) · [개발·고급 설정](docs/DEVELOPMENT.md)
