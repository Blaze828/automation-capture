# Mac 설치·사용 안내

**VSIX 파일 하나만 설치하면 됩니다. Node.js·Python·캡처 도구가 모두 포함되어 있습니다.** · 0.7.0

기존 Python이나 Conda 버전에 맞춰 명령어를 실행할 필요가 없습니다.

[전체 안내](README.md) · [Windows 안내](README.windows.md)

## 처음 설치하기

**Apple 메뉴 → 이 Mac에 관하여**에서 칩 또는 프로세서를 확인하세요.

| 표시된 종류 | 받을 파일 |
|---|---|
| **Apple M시리즈** | **[M시리즈용 다운로드](https://github.com/Blaze828/automation-capture/releases/download/v0.7.0/js-assignment-autocapture-0.7.0-darwin-arm64.vsix)** |
| **Intel** | **[Intel용 다운로드](https://github.com/Blaze828/automation-capture/releases/download/v0.7.0/js-assignment-autocapture-0.7.0-darwin-x64.vsix)** |

1. 내 Mac에 맞는 **`.vsix` 파일 하나**를 다운로드합니다.
2. VS Code에서 **확장 → 위쪽 ⋯ → VSIX에서 설치…**를 누릅니다.
3. 다운로드한 파일을 선택합니다. 다시 로드 안내가 나오면 누릅니다.

macOS 13 이상과 [VS Code](https://code.visualstudio.com/download) 1.100 이상을 사용합니다. **터미널 명령이나 Python 경로 설정은 필요 없습니다.**

## 실행하기

1. **파일 → 폴더 열기**로 과제 폴더를 엽니다.
2. 실행할 **`.js` 파일**을 클릭합니다.
3. **Control+Option+Q**를 누릅니다.
4. 저장 폴더와 이미지 형식을 물으면 선택합니다.

실행이 끝나면 **JS 원본과 결과 이미지가 자동 저장**됩니다. 같은 과제 폴더에서는 저장 설정을 기억합니다. 촬영이 끝날 때까지 VS Code 창을 전면에 두세요.

### 첫 캡처 때 Mac 권한 허용

권한 안내가 나오면 **시스템 설정 → 개인정보 보호 및 보안**에서 요청한 앱(VS Code 또는 Python)을 허용하세요.

| 항목 | 필요한 기능 |
|---|---|
| **화면 및 시스템 오디오 기록** 또는 **화면 기록** | 실제 창 촬영 |
| **손쉬운 사용** | 터미널 높이 조절·REPL 영역 캡처 |

화면 기록 권한을 바꾼 뒤에는 **VS Code 완전히 종료 → 다시 열기 → Control+Option+Q** 순서로 재시도합니다. 이 권한은 macOS에서 직접 허용해야 합니다.

## 자주 쓰는 단축키

Mac의 **Control은 ⌃, Option은 ⌥**입니다.

| 할 일 | 단축키 |
|---|---|
| **실행하고 자동 저장** | **Control+Option+Q** |
| 현재 화면 한 장 더 저장 | Control+Option+W |
| PNG / JPG / WebP 변경 | Control+Option+F |

<details>
<summary><b>추가 단축키</b></summary>

| 할 일 | 단축키 |
|---|---|
| JS를 한 줄씩 입력하기(REPL 시작) | Control+Option+E |
| REPL 출력만 저장 | Control+Option+D |
| 실행 중단 | Control+Option+X |
| 직접 분할 캡처 | Control+Option+A |

REPL은 **E로 시작 → JS 입력 → D로 저장** 순서입니다.

</details>

<details>
<summary><b>잘 안될 때</b></summary>

- 단축키가 안 되면 **Command+Shift+P → Assignment: Run and Capture**로 실행하세요.
- 캡처 권한 오류는 위의 Mac 권한을 확인하고 VS Code를 완전히 종료한 뒤 다시 여세요.
- 예전 Python/Pillow 오류가 계속되면 **0.7.0 이상**인지 확인하고 다시 로드하세요. 기본 설정은 확장에 포함된 실행 환경을 사용합니다.
- Rosetta로 Intel VS Code를 사용한다면 **Intel용 확장**을 설치하세요.
- 다운로드가 안 되면 [릴리스 페이지](https://github.com/Blaze828/automation-capture/releases/latest)의 **Assets**에서 받으세요.

</details>

[기능 전체 보기](README.md#4-주요-기능) · [저장 위치·ZIP 만들기](README.md#5-결과는-어디에-저장되나요) · [개발·고급 설정](docs/DEVELOPMENT.md)
