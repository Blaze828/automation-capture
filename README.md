# JS Assignment AutoCapture

JavaScript 파일을 실행한 실제 VS Code 화면을 과제 제출용 이미지로 저장하는 확장 프로그램입니다. 현재 버전은 **0.6.0**이며 **Windows용과 Mac용 설치 파일을 따로 제공합니다.**

파일을 선택하고 단축키를 누르면 **원본 저장 → 터미널 실행 → 결과 캡처 → JS와 이미지 저장**이 이어집니다. 코드를 자동으로 작성하거나 수정하지 않으며 외부 AI API나 웹 서버도 필요하지 않습니다.

## 내 컴퓨터에 맞는 버전

| 운영체제 | VSIX 설치 파일 | 설치·사용 안내 |
|---|---|---|
| Windows 10/11 · x64 | `js-assignment-autocapture-0.6.0-win32-x64.vsix` | **[Windows 버전 README](README.windows.md)** |
| Mac · Apple Silicon (M 시리즈) | `js-assignment-autocapture-0.6.0-darwin-arm64.vsix` | **[Mac 버전 README](README.macos.md)** |
| Mac · Intel | `js-assignment-autocapture-0.6.0-darwin-x64.vsix` | **[Mac 버전 README](README.macos.md)** |

[GitHub Actions](https://github.com/Blaze828/automation-capture/actions)의 성공한 실행에서 **Artifacts**를 열고 `autocapture-win32-x64`, `autocapture-darwin-arm64`, `autocapture-darwin-x64` 중 해당 산출물을 받습니다. ZIP을 풀고 안의 VSIX를 설치하세요. Node.js와 Python 패키지는 각 운영체제 안내에 따라 별도로 준비해야 합니다.

Mac의 칩 종류는 **Apple 메뉴 → 이 Mac에 관하여**에서 확인합니다. VSIX에는 운영체제·아키텍처 대상이 지정되어 있습니다. 기능을 함께 관리할 수 있도록 Windows와 Mac 구현은 같은 소스를 공유합니다.

## 주요 기능

- **터미널 하나 재사용**: Windows는 CMD, Mac은 zsh를 사용합니다. 파일을 바꾸면 이전 출력과 스크롤 기록을 비우고 현재 명령과 결과부터 표시합니다.
- **실행 후 자동 캡처**: 실제 VS Code 창을 촬영하며 일반 실행에는 왼쪽 탐색기의 선택 파일과 활성 파일 탭을 포함합니다. 완료 문구나 종료 코드 배너는 덧붙이지 않습니다.
- **화면 배치 유지**: 출력이 들어가면 위치와 높이를 유지합니다. 넘칠 때만 한 번 높이를 조절하며 아래 여백은 약 12%, 최소 2~최대 5행으로 계산합니다.
- **긴 출력 처리**: 한 번 조절해도 길면 출력만 분할합니다. 코드가 길다는 이유로 자동 분할하지 않습니다. 제한 시간까지 반복 출력이 이어지면 중단 후 대표 화면을 저장합니다.
- **REPL 출력 캡처**: 현재 보이는 Node.js REPL 출력 영역만 저장하며 세션과 화면 배치를 유지합니다.
- **제출 파일 정리**: PNG/JPG/WebP를 선택하고 장별로 JS와 이미지를 저장하거나 ZIP으로 내보낼 수 있습니다.

## 단축키

| 기능 | Windows | Mac | 명령 팔레트 |
|---|---|---|---|
| 실행·자동 캡처 | Ctrl+Alt+Q | Control+Option+Q | `Assignment: Run and Capture` |
| 현재 화면 추가 캡처 | Ctrl+Alt+W | Control+Option+W | `Assignment: Capture Again` |
| REPL 시작 | Ctrl+Alt+E | Control+Option+E | `Assignment: Start REPL` |
| REPL 출력 캡처 | Ctrl+Alt+D | Control+Option+D | `Assignment: Capture REPL` |
| 실행 중단 | Ctrl+Alt+X | Control+Option+X | `Assignment: Stop Run` |
| 이미지 형식 선택 | Ctrl+Alt+F | Control+Option+F | `Assignment: Select Image Format` |
| 수동 분할 캡처 | Ctrl+Alt+A | Control+Option+A | `Assignment: Capture Multiple Pages` |
| 장 ZIP 내보내기 | 명령 팔레트 | 명령 팔레트 | `Assignment: Export Chapter ZIP` |
| 저장 폴더 선택·열기 | 명령 팔레트 | 명령 팔레트 | `Assignment: Select Output Folder` / `Open Output Folder` |

명령 팔레트는 Windows **Ctrl+Shift+P**, Mac **Command+Shift+P**입니다. 왼손 문자 키에 단축키를 배치했습니다. 다른 확장이나 VoiceOver와 겹치면 VS Code의 Keyboard Shortcuts에서 변경하세요.

## 결과물

예를 들어 `6장/test.js`를 실행하면 선택한 제출 루트 아래에 다음과 같이 저장됩니다.

```text
제출/
└─ 6장/
   ├─ test.js
   ├─ test 실행결과.png
   ├─ test 실행결과_02.png
   └─ test REPL.png
```

선택한 형식에 따라 확장자는 `.png`, `.jpg`, `.webp`가 됩니다. 같은 이름이 있으면 덮어쓰기·새 버전·취소를 선택할 수 있습니다. ZIP에는 해당 장 폴더 바로 아래의 JS와 캡처 이미지만 포함하고 하위 폴더는 넣지 않습니다.

## 기술 스택

| 영역 | 공통 | Windows 버전 | Mac 버전 |
|---|---|---|---|
| 확장·파일·명령 | TypeScript, VS Code Extension API | 동일 | 동일 |
| JS 실행 | Node.js, child_process, JSON 상태 전달 | 실제 CMD 재사용 | 실제 zsh 재사용 |
| 실제 창 캡처 | Python | mss, PyGetWindow, Win32/DWM | PyObjC, AppKit, Quartz, macOS screencapture |
| 영역 측정·높이 조절 | 출력 행·여백 계산 | comtypes, Windows UI Automation | ApplicationServices AX, Quartz 마우스 이벤트 |
| 이미지·압축 | Pillow, archiver | PNG/JPG/WebP·ZIP | PNG/JPG/WebP·ZIP |
| 빌드·검증 | TypeScript Compiler, @vscode/vsce, node:test, unittest, GitHub Actions | Windows x64 러너 | Apple Silicon·Intel Mac 러너 |

## 검증 상태

2026-11-06 [실제 CI 실행](https://github.com/Blaze828/automation-capture/actions/runs/42192492596)에서 **Windows x64, Mac Apple Silicon, Mac Intel 모두 성공**했습니다. Mac은 VS Code 1.145.1을 직접 실행해 실제 창과 REPL 이미지까지 저장했습니다. 상세 결과는 [TESTING.md](TESTING.md)에 기록했습니다.

| 검사 | Windows x64 | Mac Apple Silicon | Mac Intel |
|---|---|---|---|
| 의존성 설치·컴파일·단위 검사 | Node 18 + Python 22 통과, Mac 전용 1개 제외 | Node 18 + Python 23 통과 | Node 18 + Python 23 통과 |
| 실제 셸 재사용·입력·중단 | CMD 통과 | zsh 통과 | zsh 통과 |
| VS Code 확장 API 통합 | 0.6.0 로컬 재검사는 업데이트 잠금으로 실행 불가 | 통과 | 통과 |
| 실제 GUI 캡처·REPL·높이 조절 | 0.5.0 실화면 확인, 0.6.0은 회귀 단위 검사 | 통과 · macOS 15.8.2 | 통과 · macOS 15.7.9 |
| PNG/JPG/WebP 실제 저장 | 인코딩 단위 검사 통과 | 세 형식 실제 저장·서명 검사 통과 | 세 형식 실제 저장·서명 검사 통과 |
| 대상별 VSIX 패키징 | win32-x64 성공 | darwin-arm64 성공 | darwin-x64 성공 |

Mac에서는 18줄 출력의 자동 높이 조절 후 한 장 저장, 90줄 출력의 분할 저장, 긴 소스·짧은 출력의 한 장 저장, 반복 출력 대표 화면, REPL 영역만 저장하는 흐름을 확인했습니다. 일반 이미지의 선택 파일·활성 탭과 REPL 이미지에서 코드 영역이 빠진 것도 직접 확인했습니다. [Mac 검증 화면](README.macos.md#검증-화면)

단위 검사·셸 검사와 실제 GUI 촬영 검증은 구분합니다. Mac 권한 상태, 생성 이미지, 검증 완료 시각·VS Code 버전을 담은 `gui-verification.json`은 CI 산출물에 남깁니다. Retina 좌표 계산은 단위 검사로 확인했으며 실제 Retina 장치·혼합 배율 다중 모니터는 별도 확인이 필요합니다.

## 개발·빌드

Node.js 22 이상과 Python 3.10 이상을 사용합니다. Python 의존성은 OS 마커에 따라 해당 운영체제에 필요한 패키지만 설치됩니다.

```sh
npm ci
npm run compile
npm test
npm run package:windows
npm run package:mac
```

`package:windows`는 Windows x64 파일 하나, `package:mac`은 Apple Silicon·Intel 파일 두 개를 `dist/`에 만듭니다. `npm run package:all`은 세 파일을 모두 만듭니다. 현재 컴퓨터와 다른 대상용 VSIX도 패키징할 수 있지만 실행 검증은 해당 운영체제에서 해야 합니다.

Python 검사는 설치에 사용한 Python으로 `-m unittest discover -s test -p 'test_*.py'`를 실행합니다. 실제 VS Code 통합 검사는 `npm run test:integration`이며, `AUTOCAPTURE_API_ONLY=1`은 화면 촬영을 제외한 확장·터미널 API 검사입니다.

## 지원 범위

Windows와 macOS의 **로컬 데스크톱 VS Code**에서 신뢰한 JS 작업 폴더를 사용합니다. Linux, VS Code 웹, WSL/SSH/컨테이너와 VS Code 밖 별도 터미널 촬영은 지원하지 않습니다. 대상 창은 전면에 있고 모니터 안에 보여야 합니다.

실행 출력은 최대 1,000,000자를 보관합니다. 반복 감지는 무한 루프를 완벽히 판정하지 않으며 입력 대기나 출력 없는 루프에는 계속 실행·중단·수동 캡처 선택지가 표시됩니다. 전체 화면 TUI, 복잡한 ANSI 커서 제어, 서로 다른 배율/HDR의 다중 모니터는 환경별 확인이 필요합니다.

[MIT License](LICENSE)
