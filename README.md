# JS Assignment AutoCapture

Windows 10/11의 **로컬 Visual Studio Code**에서 직접 작성한 JavaScript를 원래 위치에서 Node.js로 실행하고, 코드와 하단 터미널이 보이는 **실제 VS Code 창**을 PNG로 저장하는 확장입니다. 코드를 생성하거나 수정하지 않습니다.

## 준비 및 개발 실행 (1~5단계)

1. Windows용 VS Code, Node.js 22 이상, Python 3.10 이상을 설치합니다.
2. 이 저장소를 복제하고 터미널에서 다음 명령을 실행합니다.

   ```powershell
   npm install
   python -m pip install -r python/requirements.txt
   npm test
   ```

3. VS Code에서 저장소 폴더를 열고 **F5 → Run AutoCapture Extension**을 실행합니다. TypeScript가 빌드되고 별도 Extension Development Host 창이 열립니다.
4. 새 창에서 `examples/4장/131.js`를 열고 `Ctrl+Alt+R`을 누릅니다. 처음 한 번 제출 폴더를 선택합니다. 창이 전면에 있고 다른 창에 가려지지 않아야 합니다.
5. 터미널에 한글을 포함한 5줄의 실행 결과가 보이고, 선택한 폴더의 `4장` 아래 JS와 PNG가 생성되는지 확인합니다. `오류 예제.js`에서도 오류 메시지가 찍힌 이미지를 확인합니다.

`python` 명령이 Microsoft Store로 연결되거나 여러 Python을 사용한다면 `assignment.pythonPath`를 실제 Python 실행 파일의 절대 경로로 설정하고 **같은 실행 파일**로 `-m pip install -r python/requirements.txt`를 실행하세요. Node/Python 경로에 인수를 넣지 않습니다.

## 명령

| 명령 팔레트 | 단축키 | 동작 |
|---|---|---|
| Assignment: Run and Capture | Ctrl+Alt+R | 원본 저장 → Node 실행 → 실제 창 캡처 |
| Assignment: Capture Again | Ctrl+Alt+S | 재실행 없이 현재 화면 추가 저장 |
| Assignment: Select Output Folder | | 제출 폴더 선택 및 설정 저장 |
| Assignment: Open Output Folder | | 최근 장 또는 제출 루트 열기 |

편집기 오른쪽 위 카메라 버튼과 왼쪽 하단 Assignment 상태 표시줄에서도 실행할 수 있습니다.

## 저장 방식과 실행

`C:\Projects\JavaScript\4장\131.js`를 실행하면 제출 루트에 다음 결과를 저장합니다.

```text
과제제출/
└─ 4장/
   ├─ 131.js
   ├─ 131 실행결과.png
   └─ 131 실행결과_02.png
```

작업 폴더는 원본 JS가 있는 폴더입니다. 상대 경로의 모듈과 데이터 파일은 원본 위치에서 참조합니다. 제출 폴더에는 JS 원본과 PNG만 복사하므로 의존 파일을 포함한 독립 실행 패키지는 아닙니다. 원본을 최신 내용으로 저장한 후 실행 직전 스냅샷을 복사합니다.

기존 파일이 있으면 덮어쓰기/새 버전/취소를 선택합니다. 이미지와 코드의 변경을 각각 임시 파일에서 완료한 뒤 게시합니다. 이미지 캡처 실패 시 이미 복사한 JS는 유지하며 오류를 알립니다. 성공 알림은 PNG 저장이 끝난 후에만 표시합니다. Capture Again은 이미지 번호를 증가시킵니다.

실행 결과용 Pseudoterminal은 stdout/stderr를 UTF-8로 표시합니다. 단순 줄 입력 프로그램은 터미널에 입력 후 Enter를 누르세요. Ctrl+C로 실행 중단, Ctrl+D로 표준 입력을 닫을 수 있습니다. 기본 30초 후 계속 실행/중단/수동 캡처를 선택합니다. 전체 화면 TUI와 ANSI 키 조작을 요구하는 앱은 지원 대상이 아닙니다.

## 설정

VS Code 설정에서 `assignment`를 검색합니다.

| 설정 | 기본값 | 설명 |
|---|---|---|
| assignment.outputFolder | 빈 문자열 | 절대 경로; 명령으로 선택하면 워크스페이스, 폴더가 없으면 사용자 설정에 저장 |
| assignment.nodePath | node | Node.js 실행 파일 |
| assignment.pythonPath | python | 캡처 패키지를 설치한 Python 실행 파일 |
| assignment.timeoutSeconds | 30 | 실행 제한 시간 |
| assignment.captureDelayMs | 800 | 화면 렌더링 대기 시간 |

WSL/SSH/컨테이너와 가상 파일 시스템은 지원하지 않습니다. 제한 모드에서는 실행되지 않으며, 신뢰한 로컬 과제 폴더에서 사용합니다.

## 캡처 조건과 제한

Python은 활성 VS Code 창의 프로세스·파일명과 HWND/PID를 확인해 해당 창에 결합합니다. 캡처 시에도 동일 창의 전면 상태, 위치, 다른 창의 겹침을 확인합니다. 찾지 못했을 때 바탕화면이나 임의의 창을 대신 저장하지 않습니다. 사용자 지정 `window.title`에는 `${activeEditorShort}`가 포함되어야 합니다.

디스플레이 배율은 Per-Monitor DPI Awareness V2로 처리하고 DWM 창 경계를 기준으로 mss로 촬영합니다. 음수 좌표의 보조 모니터도 처리합니다. 창은 모니터 안에 전부 표시되어야 합니다. 서로 배율이 다른 모니터, HDR 및 원격 데스크톱 환경은 실제 장치별 확인이 필요합니다.

코드 또는 실행 결과가 보이는 영역을 넘으면 현재 화면만 저장했다고 안내합니다. 글자 크기와 터미널 높이를 조절하거나 스크롤한 뒤 Capture Again을 사용하세요. 원본 글꼴과 화면 비율을 유지하며 이미지를 합성하지 않습니다. 알림, 자동 완성, 메뉴 등이 내용 위를 가리지 않도록 닫고 캡처하세요.

## 테스트

```powershell
npm test
python -m py_compile python/capture.py
npm run test:integration
```

단위 테스트는 한글/공백 경로, 상대 경로 모듈, stdout/stderr, 구문/실행 오류, 입력 대기, 중복 실행, 제한 시간과 중단, Node 미설치를 확인합니다. 통합 테스트는 설치된 VS Code를 별도 프로필로 열고 실제 JS/PNG 저장을 검사합니다. 실행 중 테스트 창을 전면에 유지해야 합니다. 로그와 산출물은 `.test-artifacts/`에 있습니다. 다른 설치 위치는 `VSCODE_EXECUTABLE`, Python 경로는 `AUTOCAPTURE_PYTHON` 환경 변수로 지정할 수 있습니다.

## VSIX 패키징 및 설치

```powershell
npm run package
code --install-extension .\js-assignment-autocapture-0.1.0.vsix
```

또는 VS Code Extensions의 `... → Install from VSIX...`에서 패키지를 선택하세요. Python과 캡처 패키지는 별도 설치가 필요합니다. VSIX에는 TypeScript 컴파일 결과와 Python 스크립트 및 런타임 Node 의존성을 포함합니다. Marketplace에 자동 게시하지 않습니다.

MIT License.
