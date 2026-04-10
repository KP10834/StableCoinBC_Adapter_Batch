# StableCoin BC Adapter Batch

블록체인 어댑터 운영 모니터링 배치. PM2 cron으로 주기적 실행 → 구조화 로그 출력 → ELK 수집 → 알림.

## 배치 Job 목록

| Job | 주기 | 설명 |
|-----|------|------|
| `balance-check` | 5분 | 핫월렛 네이티브/ERC-20 잔액 임계값 체크 |
| `health-check` | 5분 | RPC 노드, WebSocket, PM2 프로세스, Adapter 헬스 체크 |
| `pending-tx` | 5분 | Outbox DB에서 오래된 미발행 TX 감지 |
| `block-scan-verify` | 10분 | Listener 블록 스캔 지연 검증 |

## 설치

```bash
npm ci
cp .env.example .env  # 환경변수 설정
```

## 개발

```bash
npm run dev:balance      # 잔액 체크
npm run dev:health       # 헬스 체크
npm run dev:pending-tx   # Pending TX 감시
npm run dev:block-scan   # 블록 스캔 검증
```

## 빌드 및 운영

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 logs                 # 로그 확인
```

## 환경변수

### 공통

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `CONFIG_DATABASE_URL` | Adapter config.db 경로 | `file:../StableCoinBC_Adapter/data/config.db` |
| `RPC_TIMEOUT_MS` | RPC 요청 타임아웃 (ms) | `5000` |
| `LOG_LEVEL` | 로그 레벨 | `info` |
| `LOG_PRETTY` | 로그 줄바꿈 포맷 | `true` |
| `LOG_COLORIZE` | 로그 색상 | `false` |

### balance-check

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `HOT_WALLET_ADDRESS` | 모니터링 대상 핫월렛 주소 | (필수) |
| `THRESHOLD_NATIVE` | 네이티브 토큰 임계값 | `0.1` |
| `THRESHOLD_TOKEN` | ERC-20 토큰 임계값 | `10` |

### health-check

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `ADAPTER_HEALTH_URL` | Adapter 헬스 엔드포인트 | `http://localhost:8081/health` |
| `ADAPTER_WS_URL` | Adapter WebSocket 엔드포인트 | `ws://localhost:8080/ws` |
| `HEALTH_CHECK_TIMEOUT_MS` | 체크 타임아웃 (ms) | `5000` |

### pending-tx

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `OUTBOX_DATABASE_URL` | Adapter outbox.db 경로 | `file:../StableCoinBC_Adapter/data/outbox.db` |
| `PENDING_TX_THRESHOLD_MINUTES` | 미발행 판정 기준 (분) | `10` |

### block-scan-verify

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `LISTENER_STATE_DIR` | Listener .state 디렉토리 경로 | `../StableCoinBC_Adapter_Listener/.state` |
| `BLOCK_LAG_THRESHOLD` | 블록 지연 임계값 (블록 수) | `100` |

## 로그 타입 (ELK 필터링용)

| type | 레벨 | 의미 |
|------|------|------|
| `RPC_OK` / `RPC_DOWN` | info / error | RPC 노드 연결 상태 |
| `WS_OK` / `WS_DOWN` | info / error | WebSocket 연결 상태 |
| `PM2_OK` / `PM2_WARN` / `PROCESS_DOWN` | info / warn / error | PM2 프로세스 상태 |
| `ADAPTER_OK` / `ADAPTER_UNHEALTHY` | info / error | Adapter 헬스 상태 |
| `HEALTH_SUMMARY` | info / warn / error | 헬스 체크 전체 요약 |
| `PENDING_TX_OK` / `PENDING_TX_STALE` | info / warn | 미발행 TX 상태 |
| `PENDING_TX_SUMMARY` | warn | 미발행 TX 요약 |
| `BLOCK_SYNC_OK` / `BLOCK_LAG` | info / warn | 블록 스캔 동기화 상태 |
| `NO_SCAN_STATE` | warn | 스캔 상태 파일 없음 |
| `BLOCK_SCAN_SUMMARY` | info / warn | 블록 스캔 전체 요약 |

## 기술 스택

- Node.js 22, TypeScript
- Pino (구조화 로깅)
- better-sqlite3 (DB 조회, readonly)
- ethers.js (RPC 잔액 조회)
- ws (WebSocket 연결 체크)
- PM2 (cron 스케줄링)
