# JS Assignment AutoCapture

Windows 10/11의 **로컬 Visual Studio Code 1.100 이상**에서 직접 작성한 JavaScript를 원래 위치에서 Node.js로 실행하고, **실제 VS Code 창**에서 실행 결과를 크게 보여 주고 PNG/JPG/WebP로 저장하는 확장입니다. 왼쪽 탐색기의 파일 선택과 위쪽 파일 탭을 함께 남기며, JS 원본은 별도 파일로 제출 폴더에 복사합니다. 코드를 생성하거나 수정하지 않습니다.

## 준비 및 개발 실행 (1~5단계)

1. Windows용 VS Code, Node.js 22 이상, Python 3.10 이상을 설치합니다.
2. 이 저장소를 복제하고 터미널에서 다음 명령을 실행합니다.

   ```powershell
   npm install
   python -m pip install -r python/requirements.txt
   npm test
   ```

3. VS Code에서 저장소 폴더를 열고 **F5 → Run AutoCapture Extension**을 실행합니다. TypeScript가 빌드되고 별도 Extension Development Host 창이 열립니다.
4. 새 창에서 `examples/4장/131.js`를 열고 `Ctrl+Alt+Q`을 누릅니다. 처음 한 번 제출 폴더를 선택합니다. 창이 전면에 있고 다른 창에 가려지지 않아야 합니다.
5. 터미널에 한글을 포함한 5줄의 실행 결과가 보이고, 선택한 폴더의 `4장` 아래 JS와 PNG가 생성되는지 확인합니다. `오류 예제.js`에서도 오류 메시지가 찍힌 이미지를 확인합니다.

`python` 명령이 Microsoft Store로 연결되거나 여러 Python을 사용한다면 `assignment.pythonPath`를 실제 Python 실행 파일의 절대 경로로 설정하고 **같은 실행 파일**로 `-m pip install -r python/requirements.txt`를 실행하세요. Node/Python 경로에 인수를 넣지 않습니다.

## 명령

| 명령 팔레트 | 단축키 | 동작 |
|---|---|---|
| Assignment: Run and Capture | Ctrl+Alt+Q | 원본 저장 → 일반 CMD에서 Node 실행 → 탐색기/탭 유지 → 높이 조절 및 자동 캡처 |
| Assignment: Capture Again | Ctrl+Alt+W | 재실행 없이 현재 화면 추가 저장 |
| Assignment: Start REPL | Ctrl+Alt+E | 원본 폴더에서 Node.js 대화형 터미널 시작 |
| Assignment: Capture REPL | Ctrl+Alt+D | 터미널 위치/크기를 유지하며 REPL 출력 영역만 저장 |
| Assignment: Capture Multiple Pages | Ctrl+Alt+A | 코드 스크롤 및 보관된 출력의 분할 캡처 |
| Assignment: Stop Run | Ctrl+Alt+X | 실행 중인 Node와 자식 프로세스 중단 |
| Assignment: Export Chapter ZIP | | 선택한 장의 JS/캡처 이미지를 안전하게 압축 |
| Assignment: Select Output Folder | | 제출 폴더 선택 및 설정 저장 |
| Assignment: Select Image Format | Ctrl+Alt+F | PNG/JPG/WebP 선택 및 설정 저장 |
| Assignment: Open Output Folder | | 최근 장 또는 제출 루트 열기 |

편집기 오른쪽 위 카메라 버튼과 왼쪽 하단 Assignment 상태 표시줄에서도 실행할 수 있습니다.

Ctrl+Alt+Q는 VS Code 내부의 자동 실행용 **cmd.exe 터미널(cmd) 하나를 재사용**하여 JS를 원래 폴더에서 실행하고, 종료를 감지한 뒤 자동으로 화면을 저장합니다. 별도 Assignment 실행 결과 Pseudoterminal을 만들지 않습니다. 출력 뒤에 `[실행 완료 · 종료 코드: 0]` 같은 완료 문구를 덧붙이지 않습니다. 캡처가 끝나면 CMD 프롬프트로 돌아오며, 그 터미널에서 직접 다른 명령도 실행할 수 있습니다. 다음 파일 실행 전에는 해당 CMD의 화면과 스크롤 기록을 비워 현재 파일의 실행 명령/결과가 맨 위부터 표시되게 합니다. 자동 실행용 CMD가 닫혔을 때만 새로 만듭니다. 다른 사용자 터미널에는 명령을 보내지 않으며 자동 실행용 CMD에서 다른 프로그램이 실행 중이면 자동 실행을 멈추고 안내합니다.

이미 열려 있는 CMD에서 직접 실행한 화면은 Ctrl+Alt+W(Capture Again)로 그대로 저장할 수 있습니다. 자동 실행으로 보관한 출력은 같은 실제 CMD에서 높이를 조절하고 필요할 때만 분할합니다. 수동 분할 시에도 같은 CMD를 재사용하여 JS 재실행 없이 보관한 출력을 표시합니다. 별도 Windows CMD 창은 촬영하지 않습니다.

처음 캡처할 때 이미지 형식을 고릅니다. **Ctrl+Alt+F** 또는 **Assignment: Select Image Format**으로 언제든 바꿀 수 있습니다. PNG와 WebP는 무손실, JPG는 품질 95로 저장합니다. JPG/WebP 저장에는 requirements.txt의 Pillow가 필요합니다.

## 저장 방식과 실행

`C:\Projects\JavaScript\4장\131.js`를 실행하면 제출 루트에 다음 결과를 저장합니다.

```text
과제제출/
└─ 4장/
   ├─ 131.js
   ├─ 131 실행결과.png
   ├─ 131 REPL.png
   └─ 131 실행결과_02.png
```

작업 폴더는 원본 JS가 있는 폴더입니다. 상대 경로의 모듈과 데이터 파일은 원본 위치에서 참조합니다. 제출 폴더에는 JS 원본과 선택한 형식의 이미지만 복사하므로 의존 파일을 포함한 독립 실행 패키지는 아닙니다. 원본을 최신 내용으로 저장한 후 실행 직전 스냅샷을 복사합니다.

기존 파일이 있으면 덮어쓰기/새 버전/취소를 선택합니다. 이미 동일한 JS가 복사되어 있으면 그대로 유지합니다. 이미지와 코드의 변경을 각각 임시 파일에서 완료한 뒤 게시합니다. 이미지 캡처 실패 시 이미 복사한 JS는 유지하며 오류를 알립니다. 성공 알림은 이미지 저장이 끝난 후에만 표시합니다. Capture Again은 이미지 번호를 증가시킵니다. 실행 도중 원본 코드가 바뀌면 코드/결과가 불일치하는 자동 캡처를 중단합니다.

일반 CMD 터미널에서 원본 JS의 stdout/stderr를 UTF-8로 표시합니다. 단순 줄 입력 프로그램은 터미널에 입력 후 Enter를 누르세요. Ctrl+C 또는 Ctrl+Alt+X로 실행을 중단할 수 있습니다. Windows의 표준 입력 종료는 프로그램에 따라 Ctrl+Z 후 Enter를 사용합니다. 기본 30초가 지나도 반복 출력(같은 문구·여러 줄 주기·증가하는 숫자 등)이 계속되면 반복 실행으로 추정하여 자동 중단하고 대표 출력 한 화면을 저장합니다. 정상 종료한 유한 반복문은 모든 출력을 캡처합니다. 반복 증거가 없는 입력 대기·출력 없는 루프는 기존처럼 계속 실행/중단/수동 캡처를 선택합니다. Ctrl+Alt+X로 즉시 중단해도 대표 출력만 저장하며 출력 페이지를 자동으로 늘리지 않습니다. 무한 루프 여부를 완벽하게 판정하는 기능은 아닙니다. 전체 화면 TUI와 ANSI 키 조작을 요구하는 앱은 지원 대상이 아닙니다.

## REPL·ZIP (6~7단계)

JS 파일을 선택하고 Ctrl+Alt+E로 시작한 뒤 사용자가 직접 `1 + 2`, 변수 선언 등 필요한 테스트를 입력합니다. 확장은 REPL 코드를 입력하지 않습니다. Ctrl+Alt+D는 REPL 터미널의 위치와 크기를 유지하며 출력 영역만 잘라 저장하고 마지막 선택한 JS 파일명을 기준으로 `131 REPL.png`를 저장합니다. 터미널 포커스 상태에서도 파일을 기억합니다. 같은 폴더에서 Start REPL을 다시 호출하면 기존 세션을 재사용하며, REPL 캡처 중에도 화면 배치를 바꾸거나 세션을 초기화/종료하지 않습니다. REPL 이미지는 터미널 출력 영역만 포함합니다. 다른 폴더에서 새 세션을 시작하면 기존 터미널은 남고 가장 최근 REPL을 캡처 대상으로 사용합니다.

Export Chapter ZIP에서 제출 루트의 장 폴더를 선택하면 `4장.zip`을 생성합니다. 그 장 바로 아래의 일반 JS/캡처 이미지 파일만 포함하며 하위 폴더·링크·다른 파일은 제외합니다. 기존 ZIP은 완성된 임시 ZIP으로 교체하므로 압축 실패가 기존 ZIP을 손상시키지 않습니다. 원본 제출 파일은 삭제하지 않습니다. Windows 탐색기에서 ZIP을 열어 한글 파일명과 내용을 확인하세요.

## 분할 캡처 (8단계)

Run and Capture는 왼쪽 탐색기를 열고 실행한 파일을 선택합니다. 위쪽 파일 탭과 사용자가 정한 터미널 위치/크기를 유지합니다. 출력이 이미 들어가면 크기를 조절하지 않습니다. 잘릴 때만 현재 창의 실제 경계와 글자 높이로 필요한 높이를 계산하여 경계선을 한 번 이동합니다. 출력 아래 여백은 출력 길이의 약 12%, 최소 2줄에서 최대 5줄로 잡습니다. 편집기 공간이 더 없거나 왼쪽/오른쪽 패널처럼 높이를 늘릴 수 없는 배치이면 위치를 옮기지 않고 출력만 분할합니다. 최대화/축소를 반복하며 크기를 탐색하지 않습니다. 코드 길이 때문에 자동 분할하지 않습니다. 출력 전체가 이 큰 터미널에도 들어가지 않을 때만 출력 페이지를 `_02`, `_03` 순서로 저장합니다. 중단된 실행은 대표 출력 한 화면만 저장합니다. 글자 크기는 바꾸지 않습니다. 캡처 중에는 실행 상태/출력 보관을 담당하는 보조 프로세스가 CMD를 유지하고, 저장 후 종료되어 일반 CMD 프롬프트를 돌려줍니다.

수동으로 나누려면 Capture Multiple Pages(Ctrl+Alt+A)에서 코드/출력/둘 다를 선택합니다. JS를 재실행하지 않습니다. 코드 접기를 풀고 화면에 실제로 표시된 줄 범위를 읽으며 일부 줄을 겹쳐 스크롤합니다. 실행 출력은 최대 1,000,000자까지 보관하고, 터미널 크기와 한글 문자 폭을 고려해 페이지로 나눈 뒤 **실제 CMD 터미널에 표시하고 VS Code 창을 촬영**합니다. 페이지 머리글과 `_02`, `_03` 등의 이미지 번호로 순서를 확인할 수 있습니다. 이미지 합성이나 가상 코드 렌더링은 사용하지 않습니다.

출력 분할은 이 확장의 Run and Capture로 실행한 **같은 파일**의 결과에만 지원합니다. REPL 스크롤백은 VS Code API가 읽기 기능을 제공하지 않으므로 직접 터미널을 스크롤하고 Capture REPL/Capture Again으로 저장하세요. 분할 후 편집기 위치와 원래 터미널 출력 표시를 복원합니다. 줄 접기는 풀린 상태로 남습니다.

가로로 긴 코드는 **Alt+Z(자동 줄 바꿈)**를 켜세요. 하나의 긴 논리적 줄이 편집기 높이를 넘는 경우 글자 크기를 조정하거나 수동으로 추가 캡처해야 합니다. 터미널 문자 폭과 ANSI 커서 이동은 완벽히 해석하지 않으므로 복잡한 터미널 UI는 수동 캡처가 필요합니다. 출력 보관 한도를 초과하면 전체 분할 캡처 성공으로 표시하지 않습니다. 중도 취소/실패 시 완료된 이미지는 유지하고 저장 수를 안내합니다.

## 설정

VS Code 설정에서 `assignment`를 검색합니다.

| 설정 | 기본값 | 설명 |
|---|---|---|
| assignment.imageFormat | 빈 문자열 | 첫 캡처 시 PNG/JPG/WebP 선택. Ctrl+Alt+F로 변경하며 다음 실행에도 유지 |
| assignment.outputFolder | 빈 문자열 | 절대 경로; 명령으로 선택하면 워크스페이스, 폴더가 없으면 사용자 설정에 저장 |
| assignment.nodePath | node | Node.js 실행 파일 |
| assignment.pythonPath | python | 캡처 패키지를 설치한 Python 실행 파일 |
| assignment.timeoutSeconds | 30 | 실행 제한 시간 |
| assignment.captureDelayMs | 800 | 화면 렌더링 대기 시간 |

WSL/SSH/컨테이너와 가상 파일 시스템은 지원하지 않습니다. 제한 모드에서는 실행되지 않으며, 신뢰한 로컬 과제 폴더에서 사용합니다.

## 캡처 조건과 제한

Python은 활성 VS Code 창의 프로세스·파일명과 HWND/PID를 확인해 해당 창에 결합합니다. 캡처 시에도 동일 창의 전면 상태, 위치, 다른 창의 겹침을 확인합니다. 찾지 못했을 때 바탕화면이나 임의의 창을 대신 저장하지 않습니다. 사용자 지정 `window.title`에는 `${activeEditorShort}`가 포함되어야 합니다.

디스플레이 배율은 Per-Monitor DPI Awareness V2로 처리하고 DWM 창 경계를 기준으로 mss로 촬영합니다. 음수 좌표의 보조 모니터도 처리합니다. 창은 모니터 안에 전부 표시되어야 합니다. 서로 배율이 다른 모니터, HDR 및 원격 데스크톱 환경은 실제 장치별 확인이 필요합니다.

Run and Capture는 현재 위치와 높이를 우선 유지하며, 출력이 넘칠 때만 여백을 포함한 크기로 한 번 조절합니다. 출력이 넘칠 때만 출력 분할 캡처를 진행하며 코드 길이는 자동 분할 여부에 영향을 주지 않습니다. Capture Again(Ctrl+Alt+W)은 수동으로 조절한 현재 화면을 그대로 추가 저장합니다. 자동 감지는 줄 기준의 보수적 추정으로, 가로 스크롤이나 접힌 코드까지 완전하게 판별하지는 않습니다. 원본 글꼴과 화면 비율을 유지하며 이미지를 합성하지 않습니다. 알림, 자동 완성, 메뉴 등이 내용 위를 가리지 않도록 닫고 캡처하세요.

## 테스트

```powershell
npm test
python -m py_compile python/capture.py
npm run test:integration
```

단위 테스트는 한글/공백 경로, 상대 경로 모듈, stdout/stderr, 구문/실행 오류, 입력 대기, 중복 실행, 제한 시간과 중단, Node 미설치를 확인합니다. 통합 테스트는 설치된 VS Code를 별도 프로필로 열고 실제 JS/캡처 이미지 저장을 검사합니다. 실행 중 테스트 창을 전면에 유지해야 합니다. 로그와 산출물은 `.test-artifacts/`에 있습니다. 다른 설치 위치는 `VSCODE_EXECUTABLE`, Python 경로는 `AUTOCAPTURE_PYTHON` 환경 변수로 지정할 수 있습니다.

화면을 전면에 둘 수 없는 환경에서는 `AUTOCAPTURE_API_ONLY=1`로 VS Code API 통합 테스트만 실행할 수 있습니다. 이 모드는 실제 PNG 촬영을 검증하지 않습니다. 2026-11-06에는 `sum.js`의 `1 + 2` 계산을 실제 VS Code 하단 터미널에서 실행하고 결과 `3`과 코드를 함께 Capture Again으로 저장한 PNG를 직접 열어 확인했습니다. 컴퓨터 제어 도구의 투명 커서 표시창을 실제 가림 창으로 오인하던 문제도 수정했습니다.

개발은 기본 실행·캡처(1~5단계)와 REPL·ZIP·분할(6~9단계)을 커밋으로 구분했습니다. 검증 상태와 수동 점검표는 [TESTING.md](TESTING.md)에 기록합니다. GitHub Actions는 Windows에서 단위 테스트와 VSIX 패키징을 수행하고 설치 파일을 빌드 산출물로 제공합니다.

## VSIX 패키징 및 설치

```powershell
npm run package
code --install-extension .\js-assignment-autocapture-0.5.0.vsix
```

또는 VS Code Extensions의 `... → Install from VSIX...`에서 패키지를 선택하세요. Python과 캡처 패키지는 별도 설치가 필요합니다. VSIX에는 TypeScript 컴파일 결과와 Python 스크립트 및 런타임 Node 의존성을 포함합니다. Marketplace에 자동 게시하지 않습니다.

MIT License.
