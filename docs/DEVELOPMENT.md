# 개발·상세 설정

[처음 사용하는 분은 설치·실행 안내부터 확인하세요](../README.md).

## 기술 스택

| 영역 | 공통 | Windows 버전 | Mac 버전 |
|---|---|---|---|
| 확장·파일·명령 | TypeScript, VS Code Extension API | 동일 | 동일 |
| JS 실행 | Node.js, child_process, JSON 상태 전달 | 실제 CMD 재사용 | 실제 zsh 재사용 |
| 실제 창 캡처 | Python | mss, PyGetWindow, Win32/DWM | PyObjC, AppKit, Quartz, macOS screencapture |
| 영역 측정·높이 조절 | 출력 행·여백 계산 | comtypes, Windows UI Automation | ApplicationServices AX, Quartz 마우스 이벤트 |
| 이미지·압축 | Pillow, archiver | PNG/JPG/WebP·ZIP | PNG/JPG/WebP·ZIP |
| 빌드·검증 | TypeScript Compiler, @vscode/vsce, node:test, unittest, GitHub Actions | Windows x64 러너 | Apple Silicon·Intel Mac 러너 |

## 소스에서 빌드하기

Git으로 소스를 받은 뒤 저장소 폴더에서 실행합니다. 캡처용 Python은 [Windows](../README.windows.md) 또는 [Mac](../README.macos.md) 안내로 준비할 수 있습니다.

```sh
git clone https://github.com/Blaze828/automation-capture.git
cd automation-capture
```

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

Windows Python 검사:

```powershell
& "$env:USERPROFILE\.assignment-capture\Scripts\python.exe" -m unittest discover -s test -p 'test_*.py'
```

Mac Python 검사:

```sh
"$HOME/.assignment-capture/bin/python" -m unittest discover -s test -p 'test_*.py'
```

별도 VS Code 창을 여는 통합 검사에서는 `AUTOCAPTURE_PYTHON` 환경 변수에 위 가상 환경의 Python 절대 경로를 지정하세요. VS Code 설치 경로가 다르면 `VSCODE_EXECUTABLE`도 지정합니다.

## 설정

VS Code 설정에서 `assignment`를 검색합니다.

| 설정 | 기본값·설명 |
|---|---|
| `assignment.pythonPath` | 캡처 도구를 설치한 Python 실행 파일의 절대 경로. 비워 두면 Windows `python`, Mac `python3` |
| `assignment.nodePath` | `node`. 필요하면 Node 실행 파일의 절대 경로 지정 |
| `assignment.outputFolder` | 제출 루트의 절대 경로. 명령으로 선택 가능 |
| `assignment.imageFormat` | 첫 캡처 때 PNG/JPG/WebP 선택 |
| `assignment.timeoutSeconds` | 30초 |
| `assignment.captureDelayMs` | 800ms |

Node/Python 경로에는 실행 파일만 넣습니다. 폴더 경로나 인수는 넣지 않습니다.

## 화면·출력 처리

- CMD/zsh는 이 확장이 만든 터미널만 재사용합니다. 그 터미널에서 다른 프로그램이 실행 중이면 종료 후 자동 실행을 사용합니다.
- 출력이 들어가면 배치를 유지합니다. 넘칠 때만 실제 영역을 측정해 한 번 높이를 조절하며, 여백은 약 12%, 최소 2~최대 5행입니다.
- 더 늘릴 수 없으면 출력을 분할합니다. 긴 소스는 별도 JS 파일로 제출하므로 자동 코드 분할의 기준이 되지 않습니다.
- 기본 제한 시간까지 반복 출력이 계속되면 중단하고 대표 화면을 저장합니다. 입력 대기나 출력 없는 루프에는 계속 실행·중단·수동 캡처 선택지를 표시합니다.
- 같은 이름의 제출 파일에는 덮어쓰기·새 버전·취소를 선택할 수 있습니다. 장 ZIP에는 장 폴더 바로 아래의 JS와 이미지만 포함합니다.

## 추가 문제 해결

| 증상 | 확인 |
|---|---|
| Python 모듈 오류 | 설정한 Python과 패키지를 설치한 가상 환경이 같은지 확인 |
| 파일명 불일치 | 원본 JS 탭 선택. 사용자 지정 `window.title`에 `${activeEditorShort}` 포함 |
| 창이 가려져 촬영 취소 | 겹친 창·대화상자를 닫고 VS Code를 전면에 배치 |
| JS만 저장되고 이미지가 없음 | 오류 원인을 해결한 뒤 추가 캡처 단축키 W 사용 |
| Mac에서 접근성 영역을 찾지 못함 | 터미널 선택 후 재시도. 필요하면 `code --force-renderer-accessibility`로 시작 |

Mac에서 터미널 경계선을 확인하지 못하면 일반 실행은 배치를 유지하고 출력 분할로 진행합니다. REPL 영역을 확인하지 못할 때는 오류를 표시합니다.

## 지원·검증 범위

Windows와 macOS의 신뢰한 로컬 데스크톱 VS Code 작업 폴더를 사용합니다. Linux, VS Code 웹, WSL/SSH/컨테이너, 별도 외부 터미널 창 촬영은 지원하지 않습니다. 출력 보관 한도는 1,000,000자입니다. 전체 화면 TUI와 복잡한 ANSI 커서 제어는 지원 대상이 아닙니다.

[Windows·Mac CI 검증](https://github.com/Blaze828/automation-capture/actions/runs/42194055684)에서 세 환경이 성공했습니다. Mac M시리즈·Intel은 실제 창과 REPL 촬영까지 확인했으며, Windows 0.6.0 GUI 재검사는 로컬 VS Code 업데이트 잠금으로 진행하지 못했습니다. 실제 Retina 장치·혼합 배율/HDR 다중 모니터 등 남은 범위는 [검증 기록](../TESTING.md)을 확인하세요.

<details>
<summary><b>실제 Mac 검증 화면 보기</b></summary>

출력 18줄 전체, 아래 여백, 탐색기 선택 파일과 활성 탭을 한 장에 담았습니다.

![Mac 일반 실행 캡처](images/macos-run.png)

REPL은 출력 영역만 저장했습니다.

![Mac REPL 출력 캡처](images/macos-repl.png)

</details>
