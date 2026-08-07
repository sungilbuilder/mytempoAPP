/**
 * Jest 전역 설정.
 *
 * AsyncStorage 는 네이티브 모듈이라 노드 환경에서 그대로 못 쓴다.
 * 패키지가 제공하는 공식 인메모리 목을 쓴다 — 스토어의 persist 경로를
 * 실제와 같은 코드로 통과시키기 위해서다(목이 없으면 persist 자체를 못 켠다).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * expo-audio / expo-video 는 네이티브 의존이라 순수 로직 테스트에서 필요 없다.
 * 임포트 체인에 걸려 들어오는 경우를 대비해 최소한으로 막아둔다.
 */
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn(),
    volume: 1,
    loop: false,
  })),
  setAudioModeAsync: jest.fn(async () => undefined),
}));
