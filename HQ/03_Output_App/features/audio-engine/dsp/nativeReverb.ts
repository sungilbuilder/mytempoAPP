/**
 * 잔향(컨볼루션)만 네이티브에 위임한다.
 *
 * ⚠️ 왜 이 파일만 `react-native-audio-api`를 쓰는가 — 나머지 DSP(가산합성·노이즈
 * 트랜지언트·모달 공진·라우드니스)는 순수 TS 배열 연산으로도 충분히 빠르다(버퍼가
 * 짧거나, 필터가 시간영역 바이쿼드라 O(n)이기 때문). 반면 잔향 컨볼루션은
 * O(dry.length × ir.length)라 우리 루프 길이(스윙 최대 ~2.5초 ≈ 11만 샘플)와
 * IR 길이(~8천 샘플) 조합에서 순수 JS 루프로는 체감 지연이 생길 수 있다.
 * 이 한 지점만 네이티브 `ConvolverNode`(JSI, C++)로 넘긴다.
 */
import { OfflineAudioContext } from 'react-native-audio-api';

/**
 * dry * ir의 **선형** 컨볼루션 전체(길이 dry.length + ir.length - 1)를 렌더링한다.
 * 원형(루프) 처리가 필요하면 호출부가 꼬리를 앞으로 접어야 한다 — `foldCircular` 참고.
 */
export async function renderLinearConvolution(
  dry: Float32Array,
  ir: Float32Array,
  sampleRate: number,
): Promise<Float32Array> {
  const length = dry.length + ir.length - 1;
  /*
    ⚠️ 위치 인자 형태(`new OfflineAudioContext(1, length, sampleRate)`)를 쓰지 않는다.
    타입 선언상으로는 두 형태(옵션 객체 / 위치 인자) 다 지원하지만, 테스트용
    `react-native-audio-api/mock`은 옵션 객체 형태만 구현돼 있다 — 위치 인자로
    부르면 `options.length`가 `undefined`가 되어 렌더 결과가 길이 0 버퍼로
    나온다(실기기가 아니라 유닛 테스트에서만 터지는 조용한 실패라 더 위험했다).
    두 환경 모두에서 동작하는 형태로 고정한다.
  */
  const ctx = new OfflineAudioContext({ numberOfChannels: 1, length, sampleRate });

  const dryBuffer = ctx.createBuffer(1, dry.length, sampleRate);
  dryBuffer.getChannelData(0).set(dry);

  const irBuffer = ctx.createBuffer(1, ir.length, sampleRate);
  irBuffer.getChannelData(0).set(ir);

  const source = ctx.createBufferSource();
  source.buffer = dryBuffer;

  const convolver = ctx.createConvolver();
  // 우리 IR은 `buildReverbIR()`에서 이미 에너지 정규화가 끝났다 — 노드의 자체
  // normalize(균등-파워 스케일링)를 켜면 그 위에 다시 스케일이 걸려 이중 정규화된다.
  convolver.normalize = false;
  convolver.buffer = irBuffer;

  source.connect(convolver);
  convolver.connect(ctx.destination);
  source.start(0);

  const rendered = await ctx.startRendering();
  return rendered.getChannelData(0);
}

/**
 * 선형 컨볼루션 결과(길이 n + irLen - 1)를 길이 n 원형으로 접는다.
 * `result[i] = linear[i] + linear[i + n]` (i가 n을 넘는 꼬리를 앞으로 감아 붙임) —
 * `audio_tools.reverb(circular=True)`의 FFT 원형 컨볼루션과 수학적으로 동일한 결과.
 */
export function foldCircular(linear: Float32Array, n: number): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = linear[i];
  for (let i = n; i < linear.length; i++) out[i - n] += linear[i];
  return out;
}
