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

## v0.2 추가 기능

- **채집과 인벤토리:** 나무를 흔들면 목재, 바위를 캐면 돌, 덤불에서는 열매를 얻습니다. 가까이 가면 오른쪽 아래에 행동 버튼이 나타나고, PC에서는 Space나 E 키로 같은 동작을 합니다. 채집한 자리는 잠시 뒤 다시 자랍니다. 화면 상단에서 조개·목재·돌·열매 개수를 볼 수 있습니다.
- **섬 복원:** 망가진 곳 4군데를 재료로 고칩니다.
  - 모닥불: 목재 3, 돌 2
  - 꽃밭: 열매 4
  - 오두막: 목재 6, 돌 3
  - 부두: 목재 5, 조개 3 (고치면 바다 위로 걸어 나갈 수 있음)
- **진행 저장:** 위치, 인벤토리, 주운 조개, 복원 상태, 시간, 소리 설정을 브라우저(localStorage)에 자동 저장합니다. 오른쪽 위 ↺ 버튼으로 처음부터 다시 시작할 수 있습니다.
- **사운드:** 파도 소리, 발소리, 채집·복원 효과음, 잔잔한 배경 멜로디가 나옵니다. 모두 Web Audio로 합성해서 음원 파일이 없습니다. 오른쪽 위 스피커 버튼이나 M 키로 켜고 끕니다.
- **낮과 밤:** 4분마다 아침, 노을, 밤, 새벽이 돌아옵니다. 밤에는 고친 모닥불·오두막 창문·부두 등불이 빛나고 반딧불이가 날아다닙니다.

## 구조

```
src/
  main.ts              Phaser 게임 설정
  config.ts            논리 해상도
  game/iso.ts          아이소메트릭 투영 유틸
  game/island.ts       시드 기반 섬 생성
  game/textures.ts     절차적 텍스처 생성
  game/Joystick.ts     가상 조이스틱
  game/items.ts        아이템 정의, 재료 계산
  game/sites.ts        복원 지점 정의(필요 재료)
  game/save.ts         localStorage 저장/불러오기
  game/audio.ts        Web Audio 효과음·배경음 합성
  game/daynight.ts     낮밤 색조 계산
  game/textures-world.ts 채집·복원·조명·HUD 텍스처
  scenes/BootScene.ts  텍스처 생성 후 게임 시작
  scenes/GameScene.ts  월드, 플레이어 이동, 충돌, 수집
  scenes/UIScene.ts    HUD, 조이스틱, 안내 문구
```

## 배포 (GitHub Pages)

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 자동으로 빌드하고 배포합니다.
배포 주소: https://gltnr23.github.io/little-island-game/

Vite `base`가 `/little-island-game/`라서 로컬 개발 서버 주소도 `http://localhost:5173/little-island-game/` 입니다.
