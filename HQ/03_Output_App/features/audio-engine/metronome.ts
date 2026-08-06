import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';

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
 */
export class Metronome {
  private player: AudioPlayer | null = null;
  private loadedAudioFile: any = null;
  private removeStatusListener: (() => void) | null = null;
  /** 매 샷 직전 카운트인 전용 플레이어 (2026-08-01) */
  private countIn: AudioPlayer | null = null;

  async configureAudioMode() {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers', // 기존 expo-av의 shouldDuckAndroid와 동등한 동작(다른 앱 소리를 줄임, 정지시키지 않음)
    });
  }

  async load(audioFile: any, volume = 1) {
    if (this.loadedAudioFile === audioFile && this.player) {
      await this.setVolume(volume);
      return;
    }
    await this.unload();

    const player = createAudioPlayer(audioFile);
    player.loop = true;
    player.shouldCorrectPitch = true;
    player.volume = Math.min(1, Math.max(0, volume));

    // 방어적 폴백 — 위 클래스 주석 참고. 네이티브 loop 큐잉이 매끄럽지 않은 기종 대비.
    const subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.didJustFinish && player.loop) {
        player.seekTo(0);
        player.play();
      }
    });
    this.removeStatusListener = () => subscription.remove();

    this.player = player;
    this.loadedAudioFile = audioFile;
  }

  async play(rate = 1.0) {
    if (!this.player) return;
    this.stopShotCycle();
    this.player.loop = true;
    this.player.seekTo(0);
    this.player.setPlaybackRate(rate);
    this.player.play();
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
    swingCycleSec: number;
    rate: number;
    onSwing?: () => void;
  }) {
    this.stopShotCycle();
    if (!this.player) return;
    this.player.loop = false;

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
        this.player.setPlaybackRate(opts.rate);
        this.player.play();
        opts.onSwing?.();

        // ③ 다음 샷까지 대기. 전체 간격에서 이미 흘려보낸 시간을 뺀다.
        const restMs = Math.max(
          500,
          (opts.intervalSec - opts.countInSec - opts.swingCycleSec) * 1000
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

  async setRate(rate: number) {
    if (!this.player) return;
    this.player.setPlaybackRate(rate);
  }

  async setVolume(volume: number) {
    if (!this.player) return;
    this.player.volume = Math.min(1, Math.max(0, volume));
  }

  async stop() {
    this.stopShotCycle();
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
