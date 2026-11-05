# 검증 기록

검증일: 2026-11-05~06 (한국 시간). Windows 로컬, Node.js 24, Python 3.13, VS Code 1.144에서 확인했습니다.

## 자동 검증 완료

- `npm test`: **10개 통과**. 한글/공백 경로와 상대 모듈, 구문/런타임 오류, 표준 입력, 동시 실행 거부, 제한 시간 연장과 무한 루프 중단, Node 미설치, 한글 ZIP의 Python zipfile CRC 검사, 기존 ZIP 교체 및 파일 보존, 버전 이름, 유효하지 않은 창의 PNG 저장 거부, 출력 페이지 분할.
- 실제 VS Code Extension Host의 API 통합 테스트 **8개 그룹 통과**: 수정된 JS 자동 저장·복사, 덮어쓰기/새 버전/취소, 한글 Pseudoterminal 출력과 반복 실행, 실행 도중 시작된 수동 캡처와 종료 후 캡처의 경합 방지, 터미널 포커스의 JS 기억, JS가 아닌 편집기 거부, Node REPL 실행·재사용 및 캡처 실패 후 세션 유지, 긴 코드 스크롤/출력 페이지/위치 복원.
- 마지막 분할 테스트는 **캡처 백엔드를 대역으로 교체**하고 VS Code의 실제 편집기/터미널 API를 사용합니다. 이 테스트는 PNG를 만들지 않으며 화면 촬영 성공을 의미하지 않습니다.
- `python -m py_compile python/capture.py`: 통과.
- `python -m unittest discover -s test -p test_capture.py`: 3개 통과. 컴퓨터 제어 도구의 커서 표시창만 정확한 클래스명과 LAYERED/TRANSPARENT/NOACTIVATE 플래그 조합으로 제외하며, 일반 앱 창과 이름만 같은 창은 계속 가림 창으로 처리합니다.
- `npm audit`: 보고된 취약점 0개. glob/minimatch의 수정 버전을 overrides로 지정했고 ZIP 생성 및 VSIX 패키징과 함께 확인했습니다.
- `npm run package`: VSIX 생성 확인.

API 통합 테스트를 별도로 실행하려면:

```powershell
$env:AUTOCAPTURE_API_ONLY = '1'
npm run test:integration
Remove-Item Env:AUTOCAPTURE_API_ONLY
```

각 실행의 로그는 `.test-artifacts/<실행 ID>/host.log`에 남습니다. 사용자 VS Code 프로필을 수정하지 않고 별도 테스트 프로필을 생성합니다.

## 실제 PNG 촬영 검증 상태

**2026-11-06: 짧은 계산 과제의 실제 PNG 촬영 성공 경로를 확인했습니다.** `sum.js`에 `const result = 1 + 2;`와 `console.log(result);`를 작성하고, VS Code Task의 실제 프로세스 실행으로 하단 터미널에서 `node sum.js`를 실행했습니다. 종료 코드 0과 출력 `3`을 확인하고, 확장의 Capture Again 명령으로 코드와 터미널이 함께 보이는 PNG를 저장한 뒤 파일을 직접 열어 시각적으로 검토했습니다. 로컬 검증 산출물은 `demo/제출/1장/sum 실행결과_02.png`입니다.

이 과정에서 컴퓨터 제어 도구의 투명 커서 표시창(`CodexComputerUseCursorOverlay`)을 실제 가림 창으로 오인하는 문제를 발견해 수정했습니다. 다른 앱/대화상자에 대한 차단과 HWND/PID/전면 상태 검증은 유지합니다.

초기 2026-11-05에는 다른 전체 화면 프로그램이 전면을 유지해 정상 PNG 촬영 검증이 중단되었으며, 잘못된 창의 캡처 거부를 확인했습니다. 이번 계산 예제는 **Task 실행 + Capture Again** 검증이며, 아래 전체 통합 테스트의 131.js 자동 실행·오류 화면 등 모든 항목의 시각 검토를 대신하지 않습니다.

아래 테스트는 다른 전체 화면 프로그램을 종료하거나 내려 놓고 수행해야 합니다. 다중 모니터의 음수 좌표, 서로 다른 DPI 배율, HDR/원격 데스크톱도 실제 장치에서 수동 확인이 필요합니다.

```powershell
npm run test:integration
```

정상 경로 통합 테스트는 131.js와 오류 예제를 실행하고 실제 PNG 시그니처·JS 내용 및 Capture Again의 추가 파일을 검사합니다. 테스트 창을 전면에 유지하세요.

## 요구사항별 수동 완료 점검표

| 요구사항 | 자동 검증 범위 | 남은 실제 화면 확인 |
|---|---|---|
| 1. console.log 5줄 | 원본 실행·파일 복사·터미널 출력 통과 | 131.js와 실행 결과가 PNG에 함께 보임 |
| 2. 여러 줄 한글 | UTF-8 출력·한글 경로·터미널 출력 통과 | PNG 한글 가독성 |
| 3. 코드 오류 | 구문/런타임 오류 및 종료 코드 통과 | 오류 화면의 실제 PNG |
| 4. REPL | 실행·재사용·실패 시 세션 유지 통과 | 직접 여러 명령 입력 후 Ctrl+Alt+P 촬영 |
| 5. 장 ZIP | 한글 이름·내용·CRC·교체·원본 보존 통과 | 명령 팔레트에서 장 선택 후 탐색기로 ZIP 열기 |
| 6. 한글·공백 이름 | 파일 실행/복사/ZIP·실제 VS Code API 통과 | 해당 경로로 PNG 저장 |
| 7. 캡처 실패 | 잘못된 창·Python 미설치에서 PNG 없음/실패 반환 통과 | VS Code 복귀 후 Capture Again 재시도 성공 |

추가 점검:

- 저장되지 않은 JavaScript 문서에서 저장 경로 선택/취소.
- `입력 대기.js`의 터미널에 이름을 입력하고 Enter, Ctrl+C 및 제한 시간 세 가지 선택지 확인.
- `긴 출력.js` 실행 후 Capture Multiple Pages의 출력 페이지와 순서 확인.
- 긴 코드의 페이지 경계가 겹치며 마지막 줄까지 포함되는지 확인. 가로로 긴 줄은 Alt+Z 적용.
- 캡처 직전 다른 프로그램으로 전환, 창 최소화, 다른 창 겹침, 모니터 경계 밖 이동 시 거부 확인.
- 쓰기 권한 없는 출력 폴더에서 실패하고 기존 제출 파일이 유지되는지 확인.
- VSIX 설치 후 F5 개발 환경과 동일한 명령·단축키가 표시되는지 확인.
