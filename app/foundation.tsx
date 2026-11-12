'use client';
import { useEffect, useState } from 'react';
import { calculateFoundation, foundationExample, foundationFields, foundationVersion, type FoundationInput } from '../lib/foundation';

const storageKey = 'civil-foundation-v1';
const format = (value: number | null) => value === null || !Number.isFinite(value) ? '—' : value.toLocaleString('ja-JP', { maximumFractionDigits: 4 });
const reference = 'https://dot.ca.gov/-/media/dot-media/programs/engineering/documents/bridge-design-practices/202408bdpchapter101shallowfoundationsa11y.pdf';
type Case = { id: string; name: string; source: string; input: FoundationInput; version: string };
const applicability = '常時の矩形直接基礎を対象とする、線形接地圧による概略照査です。部分接地、沈下、滑動、部材設計、杭基礎は対象外です。';

export default function Foundation() {
  const [input, setInput] = useState(foundationExample);
  const [name, setName] = useState('直接基礎の計算例');
  const [source, setSource] = useState('サンプル値');
  const [cases, setCases] = useState<Case[]>([]);
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const result = calculateFoundation(input);
  const baseline = cases.find(item => item.id === selected);
  const previous = baseline ? calculateFoundation(baseline.input) : null;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(stored)) setCases(stored.filter((item: Case) => item?.input && calculateFoundation(item.input)));
    } catch {
      setNotice('保存条件を読み込めませんでした。');
    }
    setReady(true);
  }, []);

  function save() {
    if (!result) return;
    const item = { id: crypto.randomUUID(), name: name.trim() || '名称未設定', source, input, version: foundationVersion };
    const next = [...cases, item];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setCases(next);
      setSelected(item.id);
      setNotice('入力条件と許容支持力度の出典を保存しました。');
    } catch {
      setNotice('このブラウザでは条件を保存できませんでした。');
    }
  }

  const contactStatus = result ? result.fullContact ? 'OK' : 'NG' : '未判定';
  const bearingStatus = result?.bearingOK == null ? '未判定' : result.bearingOK ? 'OK' : 'NG';
  const summary = result ? [
    ['底面積 A', 'B × L', result.area, 'm²'],
    ['断面係数 Sx', 'A × L / 6', result.sx, 'm³'],
    ['断面係数 Sy', 'A × B / 6', result.sy, 'm³'],
    ['X方向の偏心 ex', 'My / N', result.ex, 'm'],
    ['Y方向の偏心 ey', 'Mx / N', result.ey, 'm'],
    ['偏心指標', '6 × (|ex| / B + |ey| / L)', result.eccentricityRatio, ''],
    ['平均接地圧', 'N / A', result.average, 'kN/m²'],
    ['最大接地圧', 'N/A + |Mx/Sx| + |My/Sy|', result.max, 'kN/m²'],
    ['最小接地圧', 'N/A − |Mx/Sx| − |My/Sy|', result.min, 'kN/m²'],
    ['支持力の使用率', '最大接地圧 / qa', result.utilization, ''],
  ] as const : [];

  function exportCsv() {
    if (!result) return;
    const rows = [
      ['検討名', name], ['許容支持力度の出典', source], ['計算モデル', foundationVersion],
      ...foundationFields.map(([key, label, unit]) => [label, input[key], unit]),
      ...summary.map(([label, formula, value, unit]) => [label, value ?? '未判定', unit, formula]),
      ...result.corners.map(corner => [corner.label, result.fullContact ? Math.max(0, corner.pressure) : '未判定', 'kN/m²']),
      ['偏心・全面接地', contactStatus], ['支持力', bearingStatus], ['適用範囲', applicability],
    ];
    const quote = (value: string | number) => {
      const safe = typeof value === 'string' && /^[\s]*[=+\-@]/.test(value) ? "'" + value : String(value);
      return '"' + safe.replaceAll('"', '""') + '"';
    };
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '直接基礎-照査.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  return (
    <main className="foundation">
      <div className="title-row">
        <div><h1>直接基礎の支持力・偏心照査</h1><p className="subtitle">矩形基礎 · 常時荷重 · 二方向の曲げ</p></div>
        <div className="actions">
          <button disabled={!result} onClick={exportCsv}>CSV出力</button>
          <button disabled={!result} onClick={() => window.print()}>PDF出力</button>
          <button className="primary" disabled={!result || !ready} onClick={save}>条件を保存</button>
        </div>
      </div>
      <p className="notice-model">{applicability} サンプルの許容値は案件の地盤資料の値に置き換えてください。</p>
      {notice && <p className="toast" role="status">{notice}</p>}
      <div className="work-grid">
        <section className="main-column">
          <div className="panel">
            <div className="panel-heading"><h2>設計条件</h2></div>
            <div className="input-grid">
              <label className="field"><span>検討名</span><div><input value={name} onChange={event => setName(event.target.value)} /></div></label>
              <label className="field"><span>許容支持力度の出典</span><div><input value={source} onChange={event => setSource(event.target.value)} /></div></label>
              {foundationFields.map(([key, label, unit]) => (
                <label className="field" key={key}><span>{label}</span>
                  <div><input type="number" step="any" value={Number.isFinite(input[key]) ? input[key] : ''} onChange={event => {
                    const value = event.target.value;
                    setInput(current => ({ ...current, [key]: value === '' ? NaN : Number(value) }));
                  }} /><small>{unit}</small></div>
                </label>
              ))}
            </div>
            <p className="field-note">荷重は基礎底面中心に換算し、Nには基礎自重などの鉛直荷重を含めます。qaには同じ荷重条件に対応する総接地圧の許容値を入力してください。</p>
          </div>
          <div className="panel">
            <div className="panel-heading"><h2>計算過程</h2><span className="muted">{foundationVersion}</span></div>
            {result ? <>
              <div className="table-wrap"><table><thead><tr><th>項目</th><th>式</th><th>計算値</th></tr></thead>
                <tbody>{summary.map(([label, formula, value, unit]) => <tr key={label}><td>{label}</td><td>{formula}</td><td>{format(value)} {unit}</td></tr>)}</tbody>
              </table></div>
              <h3>四隅の接地圧（kN/m²）</h3>
              <p>各隅の符号に応じて N/A ± Mx/Sx ± My/Sy を計算します。</p>
              {result.fullContact ? <div className="foundation-corners">{result.corners.map(corner =>
                <div key={corner.label}><small>{corner.label}</small><strong>{format(Math.max(0, corner.pressure))}</strong></div>)}</div>
                : <p>合力が底面の核外にあるため、部分接地の解析が必要です。</p>}
            </> : <p className="error">各項目に有効な数値を入力してください。B・L・N・qaは正の値が必要です。</p>}
            <p className="field-note"><a href={reference} target="_blank" rel="noreferrer">参考資料 Caltrans Bridge Design Practice §10.1.5（線形接地圧の算定式）</a></p>
          </div>
        </section>
        <aside className="results">
          <div className="panel summary">
            <div className="summary-top"><h2>照査結果</h2></div>
            <div className="check"><div><b>偏心・全面接地</b><em className={contactStatus === 'OK' ? 'ok' : 'ng'}>{contactStatus}</em></div>
              <div className="check-number">{format(result?.eccentricityRatio ?? null)}</div><small>偏心指標 ≤ 1</small></div>
            <div className="check"><div><b>支持力</b><em className={bearingStatus === 'OK' ? 'ok' : 'ng'}>{bearingStatus}</em></div>
              <div className="check-number">{format(result?.max ?? null)} <small>kN/m²</small></div><small>最大接地圧 ≤ {format(input.qa)} kN/m²</small></div>
            {result && !result.fullContact && <p className="error">全面接地条件を満たさないため、支持力は未判定です。</p>}
          </div>
          <div className="panel">
            <div className="panel-heading"><h2>保存条件・比較</h2></div>
            <label className="compare-select">比較する保存条件
              <select value={selected} onChange={event => setSelected(event.target.value)}>
                <option value="">条件を選択</option>
                {cases.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            {baseline && previous && <>
              <p className="field-note">保存条件の出典 {baseline.source || '未入力'}</p>
              <table><thead><tr><th>項目</th><th>保存値</th><th>差分</th></tr></thead>
                <tbody>
                  {foundationFields.map(([key]) => <tr key={key}><td>{key}</td><td>{format(baseline.input[key])}</td><td>{format(result ? input[key] - baseline.input[key] : null)}</td></tr>)}
                  <tr><td>偏心指標</td><td>{format(previous.eccentricityRatio)}</td><td>{format(result ? result.eccentricityRatio - previous.eccentricityRatio : null)}</td></tr>
                  <tr><td>最大接地圧</td><td>{format(previous.max)}</td><td>{format(previous.max != null && result?.max != null ? result.max - previous.max : null)}</td></tr>
                </tbody></table>
              <button className="foundation-load" onClick={() => { setInput(baseline.input); setName(baseline.name); setSource(baseline.source); setNotice('保存条件を読み込みました。'); }}>この条件を読み込む</button>
            </>}
          </div>
        </aside>
      </div>
    </main>
  );
}
