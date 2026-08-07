import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';

/**
 * 메트로놈 오디오 엔진 (2026-07-31 expo-audio 마이그레이션, WBS 2.0).
 *
 * PLANNING.md 6절 결정에 따라 JS setTimeout/setInterval로 비프를 직접 스케줄링하지 않고,
 * 템포 비율에 맞춰 사전 렌더링된 3단 비프 루프 파일(assets/audio/*.wav)을
 * 네이티브 loop 재생에 위임한다. 타이밍 정확도는 오디오 파일 자체의 정밀도에 의존한다.
 *
 * ⚠️ expo-av → expo-audio 마이그레이션 배경 (2026-07-31):
 *   expo-av는 SDK55에서 완전히 제거된다. expo-audio는 클래스 기반(Audio.Sound)이 아니라
 *   AudioPlayer 인스턴스 기반이고, React 훅(useAudioPlayer) 없이 컴포넌트 밖에서 쓰려면
 *   createAudioPlayer()로 직접 생성해야 한다(생성한 쪽이 반드시 remove()로 해제해야 함,
 *   자동 해제되지 않음 — expo-audio 공식 문서 경고).
 *
 * ⚠️ loop 정밀도 — 실기기 검증 전까지 미확정(Code Complete, Not Verified):
 *   expo-av의 Audio.Sound는 AVAudioPlayer(iOS)/단순 루프 기반이라 isLooping:true로
 *   완전 네이티브 gapless 루프가 보장됐다. expo-audio는 iOS에서 AVPlayer 기반으로 전환됐는데,
 *   AVPlayer는 원래 AVAudioPlayer만큼 단순한 네이티브 loop를 지원하지 않아 별도 큐잉
 *   메커니즘(내부적으로 "queued loop items")으로 loop=true를 구현한다. 이 큐잉이 실제로
 *   갭 없이 매끄러운지는 코드 리뷰만으로 확정할 수 없다 — WBS 2.0에 명시된 대로
 *   "배속/loop 정밀도 검증 프로토타입"은 실기기에서만 가능하다.
 *   그래서 아래 구현은 ①player.loop=true(1차, 네이티브 큐잉에 위임)에 더해
 *   ②playbackStatusUpdate 이벤트에서 didJustFinish를 감지해 seekTo(0)+play()로
 *   재동기화하는 방어적 폴백을 함께 둔다. 네이티브 loop가 완벽하면 ②는 사실상
 *   호출되지 않고(didJustFinish가 loop 전환 중엔 안 뜰 가능성이 높음), 혹시 갭/드리프트가
 *   있는 기종이라면 ②가 안전망 역할을 한다. 실기기 확인 시 특히 "루프 경계에서 박자가
 *   끊기거나 튀는지"를 반드시 체크할 것.
 *
 * ⚠️ 2026-08-07 — **배속 재생을 완전히 제거했다** (사운드 품질 Phase 1).
 *
 *   `setPlaybackRate()` + `shouldCorrectPitch = true` 조합이 음질을 가장 크게
 *   깎고 있었다. 스윙 속도 4단계의 배속이 0.825 / 0.917 / 1.031 / 1.179라
 *   **1.0이 하나도 없어서**, 사용자가 듣는 소리는 항상 위상 보코더를 통과한
 *   결과였다. 타악기는 그 처리에 가장 취약한 신호다 — 어택이 뭉개지고
 *   타격 직전에 프리에코가 낀다.
 *
 *   이제 속도별로 미리 렌더링한 파일을 그대로 재생한다(`soundPacks.loopAudio`).
 *   호출부는 속도가 바뀌면 **다른 파일을 다시 `load()`** 해야 한다.
 *   자세한 측정은 [[사운드품질-진단과개선계획-2026-08-07]].
 *
 *   ⛔ `setPlaybackRate` / `shouldCorrectPitch`를 다시 들여오지 말 것.
 *      "파일 하나로 4속도를 커버하니 번들이 작다"는 유혹이 계속 있을 텐데,
 *      그 절약분(약 7MB)이 정확히 이 앱의 유일한 소리를 망가뜨린 원인이었다.
 */
/**
 * 상태 이벤트 주기 (ms).
 *
 * 기본값은 500ms인데, 그 정도로는 2초 루프의 경계를 최대 0.5초 늦게 잡는다.
 * 스윙 카운트는 경계를 **놓치지만 않으면** 되지만, 임팩트 진동을 경계에 맞춰
 * 다시 예약하려면 지연이 작아야 한다. 100ms면 경계 검출 오차가 ±100ms이고,
 * 검출 시점의 `currentTime`으로 그 오차마저 보정할 수 있다(아래 emitCycle 참고).
 *
 * 더 줄이지 않는 이유: 이벤트가 JS 브리지를 타므로 주기를 낮출수록 부하가 는다.
 * 연습 화면은 20~40분 켜두는 화면이라 배터리도 고려해야 한다.
 */
const STATUS_INTERVAL_MS = 100;

/**
 * 루프 경계 판정 임계값 (초).
 *
 * 재생 위치가 이만큼 "뒤로 튀면" 한 바퀴 돈 것으로 본다. 2초 루프에서 0.25초는
 * 정상 진행(100ms)의 두 배 이상이라 오검출이 나지 않고, 배속 2.0배에서도
 * 한 이벤트 간 진행량(0.2초)보다 커서 놓치지 않는다.
 */
const CYCLE_WRAP_SEC = 0.25;

export class Metronome {
  private player: AudioPlayer | null = null;
  private loadedAudioFile: any = null;
  private removeStatusListener: (() => void) | null = null;
  /** 매 샷 직전 카운트인 전용 플레이어 (2026-08-01) */
  private countIn: AudioPlayer | null = null;

  /* ── 스윙 카운트를 오디오에서 뽑기 위한 상태 (2026-08-06, AOS 리뷰 P-3) ── */
  /** 루프 한 바퀴가 돌 때마다 호출된다. 인자는 "경계로부터 이미 지난 초". */
  private onCycle: ((lateSec: number) => void) | null = null;
  /** 지금 루프(연속) 모드인가 — 샷 사이클 모드에서는 경계를 세지 않는다 */
  private looping = false;
  /** 직전 이벤트의 재생 위치 */
  private lastTime = 0;
  /** seek 직후에는 위치가 뒤로 튀므로 잠깐 경계 판정을 쉰다 */
  private suppressWrapUntil = 0;

  async configureAudioMode() {
    await setAudioModeAsync({
      playsInSilentMode: true,
      /**
       * 2026-08-06 `true` → `false` (AOS 리뷰 Q-5).
       *
       * 설정과 실제 동작이 반대를 향하고 있었다. 여기서는 백그라운드 재생을
       * 허용해두고, `practice.tsx`는 백그라운드 진입 시 **무조건 정지**한다.
       * 정지시키는 판단 자체는 옳다(경과 시간이 JS 타이머라 백그라운드에서
       * 스로틀링돼 화면과 실제가 어긋나고, 배터리도 먹는다).
       *
       * 게다가 안드로이드는 포그라운드 서비스 없이는 백그라운드 오디오가
       * 어차피 제한되고, 쓰지도 않는 백그라운드 오디오 권한은 스토어 심사에서
       * 설명을 요구받는다. 동작에 설정을 맞춘다.
       */
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers', // 기존 expo-av의 shouldDuckAndroid와 동등한 동작(다른 앱 소리를 줄임, 정지시키지 않음)
    });
  }

  /**
   * 루프 한 바퀴(= 스윙 1회)마다 호출될 콜백을 등록한다. (2026-08-06 신설)
   *
   * ## 왜 필요했나 — NSM의 입력값이 JS 타이머였다
   *
   * 이전에는 `practice.tsx`가 `setInterval(CYCLE_MS / rate)`로 스윙을 셌다.
   * 문제가 세 겹이었다.
   *   ① JS 타이머는 기기 부하에 따라 드리프트한다 — 오디오와 조금씩 어긋난다
   *   ② 재생 중 설정(진동·속도)을 바꾸면 effect가 재생성되며 **카운트 위상이 초기화**된다
   *   ③ 그 숫자가 곧 NSM("스윙 20회 이상 = 완료")의 원천 데이터다
   *
   * 즉 유일한 출시 게이트(D30 리텐션)를 판정할 숫자를 오디오와 무관한 타이머로
   * 세고 있었다. 이제 **오디오가 진실의 출처**다 — 소리가 한 바퀴 돌아야 1스윙이다.
   *
   * ⚠️ `setOnCycle`은 상태를 갈아끼우지 않는다(재생 중 호출해도 카운트가 리셋되지 않는다).
   * 위 ②를 구조적으로 막기 위한 것이므로 이 성질을 깨지 말 것.
   */
  setOnCycle(fn: ((lateSec: number) => void) | null) {
    this.onCycle = fn;
  }

  private emitCycle(positionSec: number) {
    if (!this.looping) return;
    /*
      경계를 최대 STATUS_INTERVAL_MS 늦게 잡으므로, "이미 얼마나 지났는지"를
      함께 넘긴다. 호출부는 이 값으로 임팩트 진동 예약 시간을 보정한다 —
      매 사이클 오디오 기준으로 다시 잡히므로 오차가 누적되지 않는다.
    */
    this.onCycle?.(Math.max(0, positionSec));
  }

  async load(audioFile: any, volume = 1) {
    if (this.loadedAudioFile === audioFile && this.player) {
      await this.setVolume(volume);
      return;
    }
    await this.unload();

    const player = createAudioPlayer(audioFile, { updateInterval: STATUS_INTERVAL_MS });
    player.loop = true;
    /*
      `shouldCorrectPitch`를 세팅하지 않는다 (2026-08-07).
      배속이 항상 1.0이므로 아무 일도 하지 않는 설정인데, 남겨두면 "배속을
      써도 되는구나"로 읽힌다. 위 클래스 주석 참고.
    */
    player.volume = Math.min(1, Math.max(0, volume));

    const subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      const now = Date.now();
      const prev = this.lastTime;
      this.lastTime = status.currentTime;

      if (!status.playing) return;

      // 방어적 폴백 — 위 클래스 주석 참고. 네이티브 loop 큐잉이 매끄럽지 않은 기종 대비.
      if (status.didJustFinish && player.loop) {
        player.seekTo(0);
        player.play();
        this.emitCycle(0);
        this.lastTime = 0;
        this.suppressWrapUntil = now + STATUS_INTERVAL_MS * 2;
        return;
      }

      /*
        네이티브 loop가 정상인 기종에서는 didJustFinish가 뜨지 않고 재생 위치만
        조용히 0으로 돌아간다. 그래서 "위치가 뒤로 튀었는가"로 경계를 잡는다.
        seek 직후는 정상적으로 뒤로 튀므로 제외한다.
      */
      if (now >= this.suppressWrapUntil && status.currentTime + CYCLE_WRAP_SEC < prev) {
        this.emitCycle(status.currentTime);
      }
    });
    this.removeStatusListener = () => subscription.remove();

    this.player = player;
    this.loadedAudioFile = audioFile;
    this.lastTime = 0;
  }

  async play() {
    if (!this.player) return;
    this.stopShotCycle();
    this.looping = true;
    this.player.loop = true;
    this.player.seekTo(0);
    this.player.play();
    this.lastTime = 0;
    this.suppressWrapUntil = Date.now() + STATUS_INTERVAL_MS * 2;
    // 재생을 누른 순간이 첫 스윙 신호다 — 첫 바퀴도 세어야 카운트가 소리와 일치한다.
    this.emitCycle(0);
  }

  /* ─────────────────── 샷 사이클 모드 (2026-08-01, WBS 2.15) ─────────────────── */

  private shotTimer: ReturnType<typeof setTimeout> | null = null;
  /** 취소된 사이클의 예약이 살아나지 않도록 하는 세대 번호 */
  private shotGen = 0;

  /**
   * 공을 치는 상황을 위한 재생 모드.
   *
   *   [조용한 대기] → [카운트인 3초] → [스윙 신호] → 반복
   *
   * 기존 `play()`는 네이티브 loop에 2초 사이클을 통째로 맡기는 방식이라
   * 스윙과 스윙 사이에 15~40초를 넣을 수가 없었다(루프 파일 길이를 그만큼
   * 늘려야 하는데, 간격 × 비율 × 사운드팩 조합만큼 파일이 필요해진다).
   *
   * ⚠️ 여기서만 JS 타이머를 쓰는 이유 — PLANNING.md는 JS 타이머 스케줄링을
   * 금지했지만, 그건 **스윙 안쪽(1.1초)** 이야기다. 시작·탑·임팩트의 상대 타이밍은
   * 지금도 사전 렌더링된 오디오 파일이 담당하므로 정밀도가 그대로다.
   * 샷과 샷 사이 20초에서 ±50ms는 아무 의미가 없다. 정밀도가 필요한 곳과
   * 필요 없는 곳을 구분해서 쓴다.
   */
  startShotCycle(opts: {
    countInFile: unknown;
    countInSec: number;
    intervalSec: number;
    /** 지금 로드된 루프 파일 한 바퀴 길이 — `soundPacks.cycleSec(속도)` */
    swingCycleSec: number;
    onSwing?: () => void;
  }) {
    this.stopShotCycle();
    if (!this.player) return;
    this.player.loop = false;
    /*
      샷 모드는 루프가 아니라 "한 번 재생"의 반복이다. 경계 검출을 끄고,
      스윙 카운트는 아래 onSwing이 담당한다 — 세는 곳이 둘이면 이중 계수가 난다.
    */
    this.looping = false;

    const gen = ++this.shotGen;
    const alive = () => gen === this.shotGen;

    const runOnce = () => {
      if (!alive() || !this.player) return;

      // ① 카운트인 — "지금 어드레스" 신호
      try {
        this.countIn?.remove();
        const p = createAudioPlayer(opts.countInFile as never);
        p.volume = this.player.volume;
        this.countIn = p;
        p.play();
      } catch {
        // 카운트인 재생 실패는 무시한다 — 스윙 신호가 더 중요하다
      }

      // ② 카운트인이 끝나면 스윙 신호
      this.shotTimer = setTimeout(() => {
        if (!alive() || !this.player) return;
        try {
          this.countIn?.remove();
          this.countIn = null;
        } catch {
          /* 이미 해제됨 */
        }
        this.player.seekTo(0);
        this.player.play();
        opts.onSwing?.();

        // ③ 다음 샷까지 대기. 전체 간격에서 이미 흘려보낸 시간을 뺀다.
        const restMs = Math.max(
          500,
          (opts.intervalSec - opts.countInSec - opts.swingCycleSec) * 1000,
        );
        this.shotTimer = setTimeout(runOnce, restMs);
      }, opts.countInSec * 1000);
    };

    runOnce();
  }

  stopShotCycle() {
    this.shotGen++;
    if (this.shotTimer) {
      clearTimeout(this.shotTimer);
      this.shotTimer = null;
    }
    try {
      this.countIn?.remove();
    } catch {
      /* 이미 해제됨 */
    }
    this.countIn = null;
  }

  /*
    `setRate()`는 2026-08-07에 삭제했다. 속도를 바꾸려면 그 속도로 렌더링된
    파일을 `load()`한다. 위 클래스 주석의 ⛔ 항목 참고.
  */

  async setVolume(volume: number) {
    if (!this.player) return;
    this.player.volume = Math.min(1, Math.max(0, volume));
  }

  async stop() {
    this.stopShotCycle();
    this.looping = false;
    if (!this.player) return;
    this.player.pause();
  }

  async getStatus() {
    if (!this.player) return null;
    // expo-audio는 getStatusAsync 같은 비동기 API 대신 player 속성을 동기적으로 노출한다.
    return {
      playing: this.player.playing,
      currentTime: this.player.currentTime,
      duration: this.player.duration,
      volume: this.player.volume,
    };
  }

  async unload() {
    this.stopShotCycle();
    this.looping = false;
    this.onCycle = null;
    if (!this.player) return;
    try {
      this.removeStatusListener?.();
      this.player.remove(); // release()가 아니라 remove() — 호출하지 않으면 메모리 누수(expo-audio 공식 경고)
    } catch {
      // 이미 해제된 경우 — 조용히 무시한다. 화면 이탈 경로가 여러 개라 중복 호출될 수 있다.
    }
    this.removeStatusListener = null;
    this.player = null;
    this.loadedAudioFile = null;
  }
}
