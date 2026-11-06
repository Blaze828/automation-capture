# Mac 설치·사용 안내

**처음에는 아래 1~4단계만 진행하세요. 설치 후에는 과제 파일을 열고 `Control+Option+Q`를 누르면 됩니다.**

[전체 안내](README.md) · [Windows 안내](README.windows.md)

## 처음 설치하기

### 1. 필요한 프로그램 설치

macOS 13 이상에서 아래 프로그램을 준비합니다. 이미 설치했다면 그대로 사용하세요.

- [VS Code](https://code.visualstudio.com/download) — 1.100 이상
- [Node.js](https://nodejs.org/en/download) — 22 이상
- [Python](https://www.python.org/downloads/macos/) — 3.10 이상

### 2. 내 Mac에 맞는 확장 받기

**Apple 메뉴 → 이 Mac에 관하여**에서 칩 또는 프로세서를 확인하세요.

| 표시된 종류 | 받을 파일 |
|---|---|
| **Apple M1·M2·M3·M4 등 M시리즈** | **[M시리즈용 다운로드](https://github.com/Blaze828/automation-capture/actions/runs/42194055684/artifacts/13492110481)** |
| **Intel** | **[Intel용 다운로드](https://github.com/Blaze828/automation-capture/actions/runs/42194055684/artifacts/13491621447)** |

GitHub 로그인이 필요합니다. 파일 하나를 받은 뒤 다음 순서로 설치하세요.

1. 받은 **ZIP을 압축 해제**합니다.
2. VS Code에서 왼쪽 **확장 → 위쪽 ⋯ → VSIX에서 설치…**를 누릅니다.
3. 압축을 푼 폴더의 **`dist` 안에 있는 `.vsix` 파일**을 선택합니다.

### 3. 캡처 도구 준비

Mac의 **터미널** 앱을 열고, 아래 세 줄을 **한 번 복사해서 실행**합니다.

```sh
python3 -m venv "$HOME/.assignment-capture"
"$HOME/.assignment-capture/bin/python" -m pip install -r https://raw.githubusercontent.com/Blaze828/automation-capture/main/python/requirements.txt
echo "$HOME/.assignment-capture/bin/python"
```

완료되면 **마지막에 표시된 Python 경로를 복사**하세요. 다음 단계에 붙여 넣습니다.

### 4. VS Code에 경로 등록

1. VS Code에서 **Command+,**를 눌러 설정을 엽니다.
2. **사용자(User)** 탭에서 `assignment.pythonPath`를 검색합니다.
3. **Python Path 입력란**에 방금 복사한 경로를 붙여 넣습니다.
4. VS Code를 완전히 종료한 뒤 다시 엽니다.

## 매번 실행하는 방법

1. **파일 → 폴더 열기**로 과제 폴더를 엽니다.
2. 실행할 **`.js` 파일**을 클릭합니다.
3. **Control+Option+Q**를 누릅니다.
4. 저장 폴더와 이미지 형식을 물으면 선택합니다.

실행이 끝나면 **JS 원본과 결과 이미지가 자동 저장**됩니다. 같은 과제 폴더에서는 저장 설정을 기억합니다. 촬영이 끝날 때까지 VS Code 창을 전면에 두세요.

### 첫 캡처 때 권한 안내가 나오면

**시스템 설정 → 개인정보 보호 및 보안**에서 요청한 앱(VS Code 또는 Python)을 허용합니다.

| 항목 | 필요한 기능 |
|---|---|
| **화면 및 시스템 오디오 기록** 또는 **화면 기록** | 실제 창 촬영 |
| **손쉬운 사용** | 터미널 높이 조절·REPL 영역 캡처 |

화면 기록 권한을 바꾼 뒤에는 **VS Code 완전히 종료 → 다시 열기 → Control+Option+Q** 순서로 재시도하세요.

## 자주 쓰는 단축키

Mac의 **Control은 ⌃, Option은 ⌥**입니다.

| 할 일 | 단축키 |
|---|---|
| **실행하고 자동 저장** | **Control+Option+Q** |
| 현재 화면 한 장 더 저장 | Control+Option+W |
| PNG / JPG / WebP 변경 | Control+Option+F |

<details>
<summary><b>추가 단축키 — 필요할 때만 보기</b></summary>

| 할 일 | 단축키 |
|---|---|
| JS를 한 줄씩 입력하기(REPL 시작) | Control+Option+E |
| REPL 출력만 저장 | Control+Option+D |
| 실행 중단 | Control+Option+X |
| 직접 분할 캡처 | Control+Option+A |

REPL은 **E로 시작 → JS 입력 → D로 저장** 순서입니다.

</details>

<details>
<summary><b>잘 안될 때 확인할 것</b></summary>

- **`node`를 찾지 못함:** 터미널에서 `command -v node`를 실행하고, 나온 경로를 VS Code 설정의 `assignment.nodePath`에 넣으세요.
- **캡처 권한 오류:** 위의 두 권한과 Python 경로를 확인하고 VS Code를 완전히 종료한 뒤 다시 여세요.
- **단축키가 안 됨:** `Command+Shift+P`에서 `Assignment: Run and Capture`를 검색해 실행하세요.
- **다운로드가 안 됨:** GitHub 로그인을 확인하세요. 링크가 만료됐다면 [Actions](https://github.com/Blaze828/automation-capture/actions)의 최근 성공한 실행 → Artifacts에서 받으세요.
- **Rosetta로 Intel VS Code를 사용 중:** Intel용 확장 파일을 설치하세요.

</details>

[저장 폴더 변경·ZIP 만들기](README.md#3-자주-쓰는-단축키) · [자세한 설정·검증 화면](docs/DEVELOPMENT.md)
