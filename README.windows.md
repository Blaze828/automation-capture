# Windows 설치·사용 안내

**처음에는 아래 1~4단계만 진행하세요. 설치 후에는 과제 파일을 열고 `Ctrl+Alt+Q`를 누르면 됩니다.**

[전체 안내](README.md) · [Mac 안내](README.macos.md)

## 처음 설치하기

### 1. 필요한 프로그램 설치

Windows 10/11 x64에서 아래 프로그램을 준비합니다. 이미 설치했다면 그대로 사용하세요.

- [VS Code](https://code.visualstudio.com/download) — 1.100 이상
- [Node.js](https://nodejs.org/en/download) — 22 이상
- [Python](https://www.python.org/downloads/windows/) — 3.10 이상

### 2. 확장 설치 파일 받기

**[Windows 설치 파일 다운로드](https://github.com/Blaze828/automation-capture/actions/runs/42194055684/artifacts/13491641004)** · GitHub 로그인이 필요합니다.

1. 받은 **ZIP을 압축 해제**합니다.
2. VS Code에서 왼쪽 **확장 → 위쪽 ⋯ → VSIX에서 설치…**를 누릅니다.
3. 압축을 푼 폴더의 **`dist` 안에 있는 `.vsix` 파일**을 선택합니다.

### 3. 캡처 도구 준비

시작 메뉴에서 **PowerShell**을 열고, 아래 세 줄을 **한 번 복사해서 실행**합니다.

```powershell
python -m venv "$env:USERPROFILE\.assignment-capture"
& "$env:USERPROFILE\.assignment-capture\Scripts\python.exe" -m pip install -r https://raw.githubusercontent.com/Blaze828/automation-capture/main/python/requirements.txt
Write-Output "$env:USERPROFILE\.assignment-capture\Scripts\python.exe"
```

완료되면 **마지막에 표시된 Python 경로를 복사**하세요. 다음 단계에 붙여 넣습니다.

### 4. VS Code에 경로 등록

1. VS Code에서 **Ctrl+,**를 눌러 설정을 엽니다.
2. **사용자(User)** 탭에서 `assignment.pythonPath`를 검색합니다.
3. **Python Path 입력란**에 방금 복사한 경로를 붙여 넣습니다.
4. VS Code를 닫았다가 다시 엽니다.

## 매번 실행하는 방법

1. **파일 → 폴더 열기**로 과제 폴더를 엽니다.
2. 실행할 **`.js` 파일**을 클릭합니다.
3. **Ctrl+Alt+Q**를 누릅니다.
4. 저장 폴더와 이미지 형식을 물으면 선택합니다.

실행이 끝나면 **JS 원본과 결과 이미지가 자동 저장**됩니다. 같은 과제 폴더에서는 저장 설정을 기억합니다. 촬영이 끝날 때까지 VS Code 창을 전면에 두세요.

## 자주 쓰는 단축키

| 할 일 | 단축키 |
|---|---|
| **실행하고 자동 저장** | **Ctrl+Alt+Q** |
| 현재 화면 한 장 더 저장 | Ctrl+Alt+W |
| PNG / JPG / WebP 변경 | Ctrl+Alt+F |

<details>
<summary><b>추가 단축키 — 필요할 때만 보기</b></summary>

| 할 일 | 단축키 |
|---|---|
| JS를 한 줄씩 입력하기(REPL 시작) | Ctrl+Alt+E |
| REPL 출력만 저장 | Ctrl+Alt+D |
| 실행 중단 | Ctrl+Alt+X |
| 직접 분할 캡처 | Ctrl+Alt+A |

REPL은 **E로 시작 → JS 입력 → D로 저장** 순서입니다.

</details>

<details>
<summary><b>잘 안될 때 확인할 것</b></summary>

- **`python`을 찾지 못함 / Store가 열림:** Python 설치를 확인하고 PowerShell을 새로 여세요.
- **`node`를 찾지 못함:** Node.js를 설치한 뒤 VS Code를 다시 여세요.
- **단축키가 안 됨:** `Ctrl+Shift+P`에서 `Assignment: Run and Capture`를 검색해 실행하세요.
- **다운로드가 안 됨:** GitHub 로그인을 확인하세요. 링크가 만료됐다면 [Actions](https://github.com/Blaze828/automation-capture/actions)의 최근 성공한 실행 → Artifacts → `autocapture-win32-x64`에서 받으세요.

</details>

[저장 폴더 변경·ZIP 만들기](README.md#3-자주-쓰는-단축키) · [자세한 설정·개발 안내](docs/DEVELOPMENT.md)
