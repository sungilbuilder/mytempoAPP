import { encodeWav16 } from '../wav';

describe('encodeWav16', () => {
  it('RIFF/WAVE 헤더와 데이터 크기가 올바르다', () => {
    const sr = 44100;
    const pcm = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const bytes = encodeWav16(pcm, sr);
    const view = new DataView(bytes.buffer);

    const readAscii = (offset: number, len: number) =>
      String.fromCharCode(...Array.from(bytes.slice(offset, offset + len)));

    expect(readAscii(0, 4)).toBe('RIFF');
    expect(readAscii(8, 4)).toBe('WAVE');
    expect(readAscii(12, 4)).toBe('fmt ');
    expect(readAscii(36, 4)).toBe('data');
    expect(view.getUint32(24, true)).toBe(sr); // sample rate
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(view.getUint32(40, true)).toBe(pcm.length * 2); // data chunk size
    expect(bytes.length).toBe(44 + pcm.length * 2);
  });

  it('±1을 벗어나는 값도 클리핑돼 16bit 범위 안에 들어간다', () => {
    const bytes = encodeWav16(new Float32Array([2, -2]), 44100);
    const view = new DataView(bytes.buffer);
    const s0 = view.getInt16(44, true);
    const s1 = view.getInt16(46, true);
    expect(s0).toBe(0x7fff);
    expect(s1).toBe(-0x8000);
  });
});
