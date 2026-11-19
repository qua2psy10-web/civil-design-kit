import { calculateFoundation, type FoundationInput } from '../lib/foundation';

const number = (value: number) => value.toLocaleString('ja-JP', { maximumFractionDigits: 3 });
type FoundationResult = NonNullable<ReturnType<typeof calculateFoundation>>;

export default function FoundationDiagram({ input, result }: { input: FoundationInput; result: FoundationResult }) {
  // Preserve the B:L aspect ratio. Positive X is right and positive Y is up.
  const scale = Math.min(220 / input.B, 200 / input.L);
  const width = input.B * scale;
  const height = input.L * scale;
  const centerX = 200;
  const centerY = 155;
  const left = centerX - width / 2;
  const top = centerY - height / 2;
  const loadX = centerX + result.ex * scale;
  const loadY = centerY - result.ey * scale;
  const loadVisible = loadX >= 35 && loadX <= 365 && loadY >= 35 && loadY <= 275;
  const pressureScale = Math.max(input.qa, result.max ?? 0);
  const label = `基礎幅B ${number(input.B)} m、長さL ${number(input.L)} m。偏心ex ${number(result.ex)} m、ey ${number(result.ey)} m。${result.fullContact ? '全面接地' : '核外のため部分接地の解析が必要'}。`;

  return (
    <section className="panel footing-diagrams" aria-label="基礎の図示">
      <div className="panel-heading"><h2>基礎・荷重と接地圧</h2></div>
      <div className="footing-figure-grid">
        <figure>
          <figcaption>基礎平面図</figcaption>
          <svg viewBox="0 0 400 330" role="img" aria-label={label}>
            <title>基礎寸法と合力の作用位置</title>
            <desc>{label} 緑のひし形は底面の核、丸印は基礎中心、十字印は合力位置です。</desc>
            <rect x={left} y={top} width={width} height={height} fill="#eef4f1" stroke="#3c6859" strokeWidth="2" />
            <path d={`M${centerX - width / 6},${centerY} L${centerX},${centerY - height / 6} L${centerX + width / 6},${centerY} L${centerX},${centerY + height / 6} Z`} fill="#cee5d9" stroke="#527f69" strokeDasharray="4 3" />
            <path d={`M45,${centerY} H355 M${centerX},30 V275`} stroke="#80988d" strokeDasharray="5 4" />
            <path d={`M349,${centerY - 4} L355,${centerY} L349,${centerY + 4} M196,36 L200,30 L204,36`} fill="none" stroke="#637e72" />
            <text x="358" y={centerY + 6}>+X</text>
            <text x="211" y="31">+Y</text>
            <circle cx={centerX} cy={centerY} r="4" fill="white" stroke="#2f6652" strokeWidth="2" />
            {loadVisible && <g>
              <path d={`M${centerX},${centerY} H${loadX} V${loadY}`} stroke="#a24e31" strokeDasharray="3 3" fill="none" />
              <path d={`M${loadX - 7},${loadY} H${loadX + 7} M${loadX},${loadY - 7} V${loadY + 7}`} stroke="#a24e31" strokeWidth="2.5" />
              <circle cx={loadX} cy={loadY} r="9" fill="none" stroke="#a24e31" />
            </g>}
            <path d={`M${left},292 H${left + width} M${left},286 V298 M${left + width},286 V298`} stroke="#476f5d" />
            <text x={centerX} y="319" textAnchor="middle">B = {number(input.B)} m</text>
            <path d={`M65,${top} V${top + height} M59,${top} H71 M59,${top + height} H71`} stroke="#476f5d" />
            <text x="43" y={centerY} textAnchor="middle" transform={`rotate(-90 43 ${centerY})`}>L = {number(input.L)} m</text>
          </svg>
          <p className="footing-key"><span>○ 基礎中心</span><span>⊕ 合力作用点</span><span>◇ 底面の核</span></p>
          <p>ex = {number(result.ex)} m ／ ey = {number(result.ey)} m</p>
          {!loadVisible && <p className="error">合力作用点は図の表示範囲外です。</p>}
          <p>N = {number(input.N)} kN（下向き）<br />Mx = {number(input.Mx)} ／ My = {number(input.My)} kN·m</p>
        </figure>
        <figure>
          <figcaption>四隅の接地圧</figcaption>
          {result.fullContact ? <>
            <svg viewBox="0 0 400 330" role="img" aria-label={`四隅の接地圧。${result.corners.map(corner => corner.label + ' ' + number(Math.max(0, corner.pressure))).join('、')} kN/m²。許容値 ${number(input.qa)} kN/m²。`}>
              <title>四隅の接地圧と許容値</title>
              <text x="45" y="27">kN/m²</text>
              <line x1="45" y1="260" x2="380" y2="260" stroke="#688478" />
              <line x1="45" y1="50" x2="45" y2="260" stroke="#688478" />
              <line x1="45" y1={260 - input.qa / pressureScale * 180} x2="380" y2={260 - input.qa / pressureScale * 180} stroke="#9d5935" strokeDasharray="5 4" />
              <text x="380" y="27" textAnchor="end" fill="#904c2c">qa = {number(input.qa)}</text>
              {result.corners.map((corner, index) => {
                const pressure = Math.max(0, corner.pressure);
                const barHeight = pressure / pressureScale * 180;
                const x = 65 + index * 80;
                return <g key={corner.label}>
                  <rect x={x} y={260 - barHeight} width="42" height={barHeight} fill={pressure > input.qa ? '#b86745' : '#397b65'} />
                  <text x={x + 21} y={253 - barHeight} textAnchor="middle">{number(pressure)}</text>
                  <text x={x + 21} y="285" textAnchor="middle" fontSize="14">{corner.label}</text>
                </g>;
              })}
              <text x="45" y="280">0</text>
            </svg>
            <p>最大 {number(result.max!)} ／ 最小 {number(result.min!)} kN/m²</p>
            <p>破線は許容総接地圧 qa。棒の位置は平面図のX・Y方向に対応します。</p>
          </> : <div className="footing-unresolved"><strong>接地圧は未判定</strong><p>合力が底面の核外にあります。部分接地の解析が必要です。</p></div>}
        </figure>
      </div>
      <p className="footing-explanation">平面図はBとLの比率に連動します。底面の核は 6|ex|/B + 6|ey|/L ≤ 1 の範囲です。正のMxは+Y側、正のMyは+X側の接地圧を増加させます。荷重は基礎底面中心への換算値です。</p>
    </section>
  );
}
