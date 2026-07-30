import { Audio, AVPlaybackStatus } from 'expo-av';

/**
 * 메트로놈 오디오 엔진.
 * PLANNING.md 6절 결정에 따라, JS setTimeout/setInterval로 비프를 직접 스케줄링하지 않고
 * 템포 비율에 맞춰 사전 렌더링된 3단 비프 루프 오디오 파일(assets/audio/*.wav)을
 * 네이티브 loop 재생에 위임한다. 정확도는 오디오 파일 자체의 정밀도에 의존한다.
 */
export class Metronome {
  private sound: Audio.Sound | null = null;
  private loadedAudioFile: any = null;

  async configureAudioMode() {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }

  async load(audioFile: any) {
    if (this.loadedAudioFile === audioFile && this.sound) return;
    await this.unload();
    const { sound } = await Audio.Sound.createAsync(audioFile, {
      isLooping: true,
      shouldCorrectPitch: true,
    });
    this.sound = sound;
    this.loadedAudioFile = audioFile;
  }

  async play(rate: number = 1.0) {
    if (!this.sound) return;
    await this.sound.setRateAsync(rate, true);
    await this.sound.playFromPositionAsync(0);
  }

  async setRate(rate: number) {
    if (!this.sound) return;
    await this.sound.setRateAsync(rate, true);
  }

  async stop() {
    if (!this.sound) return;
    await this.sound.stopAsync();
  }

  async getStatus(): Promise<AVPlaybackStatus | null> {
    if (!this.sound) return null;
    return this.sound.getStatusAsync();
  }

  async unload() {
    if (!this.sound) return;
    await this.sound.unloadAsync();
    this.sound = null;
    this.loadedAudioFile = null;
  }
}
