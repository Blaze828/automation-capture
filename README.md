# JS Assignment AutoCapture

**JS 파일을 실행하고, 결과 화면과 원본 코드를 과제 제출용으로 저장하는 VS Code 확장입니다.** · 버전 0.7.0

**VSIX 파일 하나만 설치하세요.** Node.js·Python·캡처 패키지를 함께 제공하므로 별도 설치 명령이나 경로 설정이 필요 없습니다.

## 1. 설치하기 — 파일 하나 설치

내 컴퓨터에 맞는 파일을 받고 **VS Code → 확장 → ⋯ → VSIX에서 설치…**에서 선택하세요.

| 컴퓨터 | 설치 안내 |
|---|---|
| Windows 10/11 · x64 | **[Windows 설치하기](README.windows.md)** |
| Mac · M시리즈 또는 Intel | **[Mac 설치하기](README.macos.md)** |

설치 파일은 [공개 릴리스](https://github.com/Blaze828/automation-capture/releases/latest)에서 로그인 없이 받을 수 있습니다.

## 2. 실행하기 — 평소에는 이것만

1. VS Code에서 **파일 → 폴더 열기**로 과제 폴더를 엽니다.
2. 실행할 **`.js` 파일**을 클릭합니다.
3. **Windows는 `Ctrl+Alt+Q`, Mac은 `Control+Option+Q`**를 누릅니다.

저장 폴더와 이미지 형식을 물으면 선택하세요. 같은 과제 폴더에서는 다음 실행에도 기억합니다. 실행이 끝나면 **JS 원본과 실행 결과 이미지가 자동 저장**됩니다.

예: `6장/test.js` → 선택한 제출 폴더의 `6장/`에 `test.js`와 `test 실행결과.png` 저장.

촬영이 끝날 때까지 VS Code 창을 전면에 두세요.

## 3. 자주 쓰는 단축키

`+`는 키를 함께 누른다는 뜻입니다. Mac의 **Control(⌃)·Option(⌥)**을 사용하세요.

| 하고 싶은 일 | Windows | Mac |
|---|---|---|
| **실행하고 자동 저장** | **Ctrl+Alt+Q** | **Control+Option+Q** |
| 현재 화면 한 장 더 저장 | Ctrl+Alt+W | Control+Option+W |
| PNG / JPG / WebP 변경 | Ctrl+Alt+F | Control+Option+F |

<details>
<summary><b>추가 단축키 4개 — REPL·중단·분할</b></summary>

| 하고 싶은 일 | Windows | Mac |
|---|---|---|
| 한 줄씩 JS 입력하기(REPL 시작) | Ctrl+Alt+E | Control+Option+E |
| REPL 출력 영역만 저장 | Ctrl+Alt+D | Control+Option+D |
| 실행 중단 | Ctrl+Alt+X | Control+Option+X |
| 직접 분할 캡처 | Ctrl+Alt+A | Control+Option+A |

REPL은 **E로 시작 → 터미널에 JS 입력 → D로 저장** 순서로 사용합니다. 캡처에는 REPL 출력 영역만 들어갑니다.

</details>

<details>
<summary><b>저장 폴더 변경·ZIP 만들기</b></summary>

명령 팔레트를 열고 아래 이름을 검색하세요. **Windows: Ctrl+Shift+P / Mac: Command+Shift+P**

| 할 일 | 검색할 이름 |
|---|---|
| 저장 폴더 변경 | `Assignment: Select Output Folder` |
| 저장 폴더 열기 | `Assignment: Open Output Folder` |
| 장별 JS·이미지를 ZIP으로 묶기 | `Assignment: Export Chapter ZIP` |

</details>

## 알아두면 좋은 점

- 파일을 바꿔도 **터미널 하나를 재사용**하고, 이전 출력은 비웁니다.
- 출력이 들어가면 현재 배치를 유지합니다. 넘칠 때만 높이를 한 번 조절하고, 그래도 길면 자동 분할합니다.
- 일반 사진에는 선택 파일·탭을 함께 담고, REPL은 출력 영역만 저장합니다.

[기술 스택·소스 빌드·자세한 설정](docs/DEVELOPMENT.md) · [Windows·Mac 검증 기록](TESTING.md) · [MIT 라이선스](LICENSE)
