'use client';

// "내 주변 기관 찾기" 단추입니다.
//
// 어떻게 동작하나요?
//   1) 단추를 눌렀을 때에만 브라우저에 위치를 물어봅니다. (화면에 들어온 것만으로는 묻지 않습니다)
//   2) 받은 좌표를 곧바로 거칠게 깎아(소수점 첫째 자리, 약 10km) 시·도 하나만 고릅니다.
//   3) "○○ 같아요. 맞나요?" 하고 한 번 더 확인한 뒤, 그 지역의 도움받을 곳 목록으로 갑니다.
//
// 지키는 것
//   - 어느 시·도인지까지만 봅니다. 시·군·구나 동까지 좁히지 않습니다.
//     정확한 좌표는 ask() 안에서 깎인 값으로 바뀌고 어디에도 남지 않습니다. (아래 ROUGH 참고)
//   - 좌표를 서버로 보내지 않고, 저장하지 않으며, 거리(km)도 보여주지 않습니다.
//     (기관 자료에 좌표가 없어 거리를 정확히 셀 수 없고, 정확하지 않은 거리는 더 헷갈리기 때문입니다)
//   - 위치를 허락하지 않아도 바로 아래 지역 고르기로 쓸 수 있습니다.
//   - 위치를 쓸 수 없는 브라우저에서는 단추를 보여주지 않습니다.

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { nearestRegion } from '@/lib/regions';

/** 좌표를 소수점 첫째 자리로 깎습니다. (위도 0.1도 ≈ 11km) */
const ROUGH = (value: number) => Math.round(value * 10) / 10;

export interface NearbyLabels {
  /** 내 주변 기관 찾기 */
  find: string;
  /** 위치를 찾는 중이에요 */
  finding: string;
  /** 지금 계신 곳이 {region} 인가요? */
  confirm: string;
  /** {region} 기관 보기 */
  go: string;
  /** 아니에요, 직접 고를게요 */
  pick: string;
  /** 위치를 쓸 수 없을 때 */
  denied: string;
  /** 위치는 저장하지 않는다는 안내 */
  note: string;
}

export function NearbyRegion({
  locale,
  labels,
  regionNames,
}: {
  locale: string;
  labels: NearbyLabels;
  /** 시·도 key → 화면에 보여줄 이름 */
  regionNames: Record<string, string>;
}) {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<'idle' | 'asking' | 'found' | 'denied'>('idle');
  const [region, setRegion] = useState<string>('');

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && 'geolocation' in navigator);
  }, []);

  if (!supported) return null;

  function ask() {
    setState('asking');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // 좌표를 받자마자 소수점 첫째 자리까지만 남깁니다. (약 10km 칸으로 뭉개는 셈입니다)
        // 시·도를 고르는 데에는 이 정도면 충분하고, 집·학교가 드러날 만큼 정확한 값은 아예 쓰지 않습니다.
        const lat = ROUGH(position.coords.latitude);
        const lng = ROUGH(position.coords.longitude);
        const found = nearestRegion(lat, lng);
        if (!found) {
          setState('denied');
          return;
        }
        setRegion(found.key);
        setState('found');
      },
      () => setState('denied'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  }

  const label = region ? (regionNames[region] ?? region) : '';

  return (
    <div className="mt-4 border-t border-[var(--color-line)] pt-4">
      {state !== 'found' && (
        <button type="button" onClick={ask} disabled={state === 'asking'} className="lr-btn lr-btn-ghost lr-press">
          <Icon name="map-pin" size={18} /> {state === 'asking' ? labels.finding : labels.find}
        </button>
      )}

      <div aria-live="polite">
        {state === 'found' && (
          <div className="rounded-[var(--radius-control)] border border-brand-200 bg-brand-50 p-4">
            <p className="text-[15px] font-bold text-ink-900">{labels.confirm.replace('{region}', label)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push(`/${locale}/organizations?region=${encodeURIComponent(region)}`)}
                className="lr-btn lr-btn-primary lr-btn-sm lr-press"
              >
                {labels.go.replace('{region}', label)} <Icon name="arrow-right" size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegion('');
                  setState('idle');
                }}
                className="lr-btn lr-btn-ghost lr-btn-sm"
              >
                {labels.pick}
              </button>
            </div>
          </div>
        )}
        {state === 'denied' && <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{labels.denied}</p>}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{labels.note}</p>
    </div>
  );
}
