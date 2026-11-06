# JS Assignment AutoCapture

**JavaScript 파일을 실행하고, 결과 사진과 원본 코드를 과제 제출용으로 저장하는 VS Code 확장입니다.** · 버전 0.7.1

Windows와 Mac에서 사용할 수 있습니다. **내 컴퓨터에 맞는 VSIX 파일 하나만 설치하면 됩니다.** Node.js·Python·캡처 도구가 포함되어 별도 설치 명령이나 경로 설정이 필요 없습니다.

## 1. 설치하기

### 내 컴퓨터에 맞는 파일 받기

| 컴퓨터 | 설치 파일 | 자세한 안내 |
|---|---|---|
| Windows 10/11 · x64 | **[Windows용 다운로드](https://github.com/Blaze828/automation-capture/releases/download/v0.7.1/js-assignment-autocapture-0.7.1-win32-x64.vsix)** | [Windows 안내](README.windows.md) |
| Mac · Apple M시리즈 | **[M시리즈용 다운로드](https://github.com/Blaze828/automation-capture/releases/download/v0.7.1/js-assignment-autocapture-0.7.1-darwin-arm64.vsix)** | [Mac 안내](README.macos.md) |
| Mac · Intel | **[Intel용 다운로드](https://github.com/Blaze828/automation-capture/releases/download/v0.7.1/js-assignment-autocapture-0.7.1-darwin-x64.vsix)** | [Mac 안내](README.macos.md) |

Mac 종류는 **Apple 메뉴 → 이 Mac에 관하여**에서 확인합니다. Rosetta로 Intel 버전 VS Code를 사용한다면 Intel용 확장을 선택하세요.

### VS Code에 설치하기

1. [VS Code](https://code.visualstudio.com/download)를 엽니다. **1.100 이상**을 사용합니다.
2. 왼쪽 **확장 아이콘 → 확장 목록 위쪽 ⋯ → VSIX에서 설치…**를 누릅니다.
3. 받은 **`.vsix` 파일**을 선택합니다.
4. **다시 로드** 안내가 나오면 누릅니다.

설치 파일은 압축을 풀지 않고 그대로 선택하세요. GitHub 로그인 없이 받을 수 있고, 다른 사람에게 해당 VSIX 파일만 전달해서 설치할 수도 있습니다.

### Mac은 첫 캡처 때 권한 허용

macOS 13 이상에서 **시스템 설정 → 개인정보 보호 및 보안**으로 이동해 권한 안내에 표시된 앱(VS Code 또는 Python)을 허용하세요.

| 권한 | 용도 |
|---|---|
| **화면 기록** 또는 **화면 및 시스템 오디오 기록** | 실제 VS Code 창 촬영 |
| **손쉬운 사용** | 터미널 높이 조절·REPL 출력 영역 확인 |

권한을 바꾼 뒤에는 **VS Code를 완전히 종료하고 다시 실행**합니다. [Mac 권한 안내](README.macos.md#첫-캡처-때-mac-권한-허용)

## 2. 실행하기

1. VS Code에서 **파일 → 폴더 열기**로 과제 폴더를 엽니다.
2. 실행할 **`.js` 파일**을 클릭합니다.
3. **Windows: `Ctrl+Alt+Q` / Mac: `Control+Option+Q`**를 누릅니다.
4. 처음에는 **결과를 저장할 폴더**와 **이미지 형식(PNG·JPG·WebP)**을 선택합니다.
5. 실행이 끝나면 **JS 원본과 실행 결과 이미지가 자동 저장**됩니다.

같은 과제 폴더에서는 저장 위치와 이미지 형식을 기억합니다. 이후에는 **JS 파일 선택 → Q 단축키**만 누르면 됩니다. 수정한 JS는 실행 직전에 자동으로 저장합니다. 촬영이 끝날 때까지 VS Code 창을 전면에 두세요.

마우스로 실행하려면 **편집기 오른쪽 위 카메라 아이콘** 또는 아래 상태 표시줄의 **Assignment**를 누릅니다. 명령 팔레트에서 **`Assignment: Run and Capture`**를 검색해도 됩니다.

### 저장 폴더 설정 — 버튼 한 번으로

1. VS Code **맨 아래의 `저장 폴더 선택`** 버튼을 누릅니다.
2. 원하는 폴더를 고르고 **`이 폴더에 저장`**을 누릅니다.

설정 후에는 버튼이 **`저장 폴더: 제출`**처럼 바뀝니다. 다시 누르면 저장 위치를 변경할 수 있고, 마우스를 올리면 전체 경로가 보입니다. 선택은 같은 과제 폴더에서 기억합니다.

키보드로는 **Windows: Ctrl+Alt+S / Mac: Control+Option+S**로 바로 선택합니다. 처음 실행할 때 고르는 방식도 그대로 사용할 수 있습니다. **0.7.1 이상**으로 업데이트하면 이 버튼이 표시됩니다.

## 3. 자주 쓰는 단축키

Windows는 **Ctrl+Alt**, Mac은 **Control(⌃)+Option(⌥)**과 아래 글자를 함께 누릅니다. Mac의 Command 키와 구분하세요.

| 할 일 | Windows | Mac |
|---|---|---|
| **JS 실행 → 자동 캡처·저장** | **Ctrl+Alt+Q** | **Control+Option+Q** |
| 현재 화면 한 장 더 저장 | Ctrl+Alt+W | Control+Option+W |
| 이미지 형식 변경 | Ctrl+Alt+F | Control+Option+F |
| **저장 폴더 선택·변경** | **Ctrl+Alt+S** | **Control+Option+S** |
| REPL 시작 | Ctrl+Alt+E | Control+Option+E |
| REPL 출력만 저장 | Ctrl+Alt+D | Control+Option+D |
| 실행 중단 | Ctrl+Alt+X | Control+Option+X |
| 직접 분할 캡처 | Ctrl+Alt+A | Control+Option+A |

단축키를 바꾸려면 VS Code의 **바로 가기 키 설정**에서 `Assignment`를 검색하고 원하는 키를 지정하세요.

## 4. 주요 기능

| 기능 | 동작 |
|---|---|
| **실행·저장 자동화** | 선택한 JS를 원래 폴더에서 실행하고, 제출 폴더에 JS 복사본과 사진을 저장 |
| **터미널 재사용** | 자동 실행에 Windows는 CMD, Mac은 zsh 하나를 사용. 다른 파일을 실행하면 이전 화면·스크롤 기록을 비우고 새 결과를 맨 위부터 표시 |
| **현재 배치 유지** | 출력이 들어가면 터미널 위치·높이를 유지. 잘릴 때만 아래 여백을 두고 높이를 한 번 조절 |
| **긴 출력 자동 분할** | 높이를 조절해도 출력이 넘치면 여러 장으로 저장. 코드가 길다는 이유만으로 자동 분할하지 않음 |
| **파일 정보 함께 촬영** | 일반 캡처에는 왼쪽 탐색기의 선택 파일과 위쪽 파일 탭을 함께 표시 |
| **반복 출력 요약** | 제한 시간이 지난 뒤 반복 출력이 감지되면 실행을 중단하고 대표 화면 한 장 저장 |
| **REPL 출력 캡처** | JS를 한 줄씩 입력하고 결과 확인. 코드 영역을 제외한 REPL 출력 영역만 저장하며 세션 유지 |
| **이미지 형식 선택** | PNG·JPG·WebP 선택 및 변경 |
| **기존 파일 처리** | 같은 이름의 결과가 있으면 덮어쓰기·새 버전 저장·취소 선택 |
| **저장 폴더 바로 선택** | 아래 저장 폴더 버튼 또는 S 단축키로 선택·변경. 버튼에 현재 폴더 이름 표시 |
| **장별 ZIP 만들기** | 선택한 장 폴더의 JS와 이미지를 ZIP으로 묶어 저장 |

입력을 기다리는 프로그램은 터미널에 직접 입력합니다. 기본 실행 제한 시간은 **30초**이며, 반복 출력이 감지되지 않은 채 시간이 지나면 **계속 실행·중단·수동 캡처**를 선택할 수 있습니다.

## 5. 결과는 어디에 저장되나요?

원본 JS가 들어 있는 **바로 위 폴더 이름**을 장 이름으로 사용합니다. 예를 들어 `과제/6장/test.js`를 실행하고 저장 폴더로 `제출`을 선택하면 다음과 같이 저장됩니다.

```text
제출/
└─ 6장/
   ├─ test.js
   └─ test 실행결과.png
```

분할 이미지와 추가 캡처에는 `_02`, `_03`처럼 번호가 붙습니다. REPL 사진은 `test REPL.png`처럼 저장됩니다. JPG·WebP를 선택했다면 해당 확장자로 저장됩니다.

**저장 폴더 변경은 아래 `저장 폴더: …` 버튼을 누르면 됩니다.** 예를 들어 `제출`을 선택하면 장별 폴더는 자동으로 만들어지므로 `6장`을 따로 고를 필요가 없습니다.

결과 폴더 열기·ZIP 만들기는 명령 팔레트에서 실행합니다. Windows는 **Ctrl+Shift+P**, Mac은 **Command+Shift+P**로 엽니다. 저장 폴더 선택도 기존 명령으로 실행할 수 있습니다.

| 할 일 | 검색할 명령 |
|---|---|
| 저장할 폴더 변경 | `Assignment: Select Output Folder` |
| 저장된 결과 폴더 열기 | `Assignment: Open Output Folder` |
| 장별 ZIP 만들기 | `Assignment: Export Chapter ZIP` |

ZIP 만들기에서 장을 선택하면 `제출/6장.zip`처럼 저장합니다. 선택한 장 폴더 바로 아래의 JS·PNG·JPG·WebP 파일을 포함합니다.

## 6. 추가 사용 방법

<details>
<summary><b>REPL: JavaScript를 한 줄씩 입력하고 저장하기</b></summary>

1. 관련 `.js` 파일을 선택하고 **E 단축키**로 REPL을 시작합니다.
2. 열린 `Assignment REPL` 터미널에 `1 + 2` 또는 `console.log('안녕하세요')` 같은 JavaScript를 입력하고 Enter를 누릅니다.
3. **D 단축키**로 REPL 출력 영역을 저장합니다.

Windows는 **Ctrl+Alt+E / D**, Mac은 **Control+Option+E / D**입니다. 캡처 후에도 입력한 변수와 REPL 세션을 계속 사용할 수 있습니다. REPL은 자동 실행용 CMD/zsh와 별도 터미널입니다.

</details>

<details>
<summary><b>현재 화면을 다시 찍거나 직접 분할하기</b></summary>

- **W 단축키**는 현재 화면을 한 장 더 저장합니다. JS를 다시 실행하지 않습니다. 터미널을 직접 조절한 뒤 촬영할 때도 사용합니다.
- **A 단축키**는 **코드와 실행 결과 / 코드만 / 실행 결과만** 중 골라 여러 장으로 저장합니다. 실행 결과가 필요하면 해당 JS를 먼저 **Q 단축키**로 실행하세요.
- 평소에는 **Q 단축키**만 사용하면 출력 길이에 따라 자동으로 분할 여부를 결정합니다.

Windows는 **Ctrl+Alt**, Mac은 **Control+Option**을 글자 키와 함께 누릅니다.

</details>

<details>
<summary><b>업데이트하기</b></summary>

[릴리스 페이지](https://github.com/Blaze828/automation-capture/releases/latest)에서 내 컴퓨터에 맞는 새 VSIX를 받습니다. 처음과 같이 **확장 → ⋯ → VSIX에서 설치… → 파일 선택 → 다시 로드** 순서로 설치하세요. VS Code 확장 목록에서 설치된 버전을 확인할 수 있습니다.

</details>

## 7. 잘 안될 때

| 증상 | 해결 방법 |
|---|---|
| 다운로드 링크가 안 열림 | [릴리스 페이지](https://github.com/Blaze828/automation-capture/releases/latest)의 **Assets**에서 내 컴퓨터에 맞는 `.vsix` 선택 |
| 단축키가 동작하지 않음 | `.js` 탭을 선택하고 명령 팔레트에서 `Assignment: Run and Capture` 실행. 바로 가기 키 설정에서 충돌 확인 |
| 작업 영역이 제한 모드임 | 본인이 신뢰하는 과제 폴더라면 VS Code의 작업 영역 신뢰를 허용한 뒤 실행 |
| 예전 Python·Pillow 설치 오류가 남음 | **0.7.1 이상**인지 확인하고 다시 로드. 설정에서 `Assignment: Use Bundled Runtime` 켜기 |
| Mac에서 권한 오류가 뜸 | 화면 기록·손쉬운 사용 권한 허용 후 VS Code 완전히 종료 → 다시 열기 |
| 캡처가 취소되거나 JS만 저장됨 | 오류 알림을 확인하고 겹친 창·대화상자를 닫아 VS Code를 전면에 둔 뒤 다시 실행 |
| 다른 JS를 실행하고 싶음 | 다음 `.js` 파일을 클릭하고 Q 단축키. 같은 자동 실행 터미널을 재사용 |

## 8. 기술 스택·지원 범위

| 영역 | 사용 기술 |
|---|---|
| VS Code 확장 | TypeScript, VS Code Extension API |
| JavaScript 실행 | 포함된 Node.js 22, Windows CMD / macOS zsh |
| 캡처·화면 조절 | 포함된 Python 3.13, Windows Win32/UI Automation, macOS AppKit/Quartz/접근성 API |
| 이미지·압축 | Pillow, archiver — PNG/JPG/WebP·ZIP |
| 빌드·검증 | TypeScript Compiler, @vscode/vsce, node:test, Python unittest, GitHub Actions |

**로컬 데스크톱 VS Code의 `.js` 과제 파일**을 대상으로 합니다. Linux·VS Code 웹·WSL/SSH/컨테이너·외부 CMD 창 촬영은 지원하지 않습니다. JS에서 사용하는 외부 npm 패키지는 해당 과제 프로젝트에 준비되어 있어야 합니다.

[Windows·Mac 검증 기록](TESTING.md) · [소스 빌드·고급 설정](docs/DEVELOPMENT.md) · [MIT 라이선스](LICENSE)
