# little-island-game
Cozy island exploration and restoration game

## 개발 환경

- Phaser 3.90 + TypeScript + Vite
- 모바일 세로 화면(720×1280 논리 해상도, 기기에 맞춰 FIT 스케일)

```bash
npm install
npm run dev      # http://localhost:5173 (같은 네트워크의 휴대폰에서도 접속 가능: --host)
npm run build    # 타입 체크 + dist/ 프로덕션 빌드
```

## 첫 버전(v0.1) 내용

- 2.5D 아이소메트릭 섬 (모래 / 잔디 / 언덕 블록, 파도 거품과 물결 반짝임)
- 캐릭터 이동: 화면 아래쪽 터치 후 드래그(플로팅 조이스틱), 데스크톱은 방향키/WASD
- 나무·바위·언덕·바다 충돌 처리(장애물을 따라 미끄러지듯 이동)
- 깊이 정렬로 나무/언덕 뒤로 걸어 들어가기
- 해변의 조개 8개 수집 → 모두 모으면 완료 배너

모든 그래픽은 부팅 시 코드로 그려지므로 외부 에셋이 필요 없습니다.

## 구조

```
src/
  main.ts              Phaser 게임 설정
  config.ts            논리 해상도
  game/iso.ts          아이소메트릭 투영 유틸
  game/island.ts       시드 기반 섬 생성
  game/textures.ts     절차적 텍스처 생성
  game/Joystick.ts     가상 조이스틱
  scenes/BootScene.ts  텍스처 생성 후 게임 시작
  scenes/GameScene.ts  월드, 플레이어 이동, 충돌, 수집
  scenes/UIScene.ts    HUD, 조이스틱, 안내 문구
```
