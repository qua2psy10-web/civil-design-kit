'use client';
import { useEffect, useState } from 'react';
import { calculateDrainage, drainageExample, drainageFields, drainageVersion, drainageResults, type DrainageInput } from '../lib/drainage';

const storageKey = 'civil-drainage-v1';
const format = (value: number | null) => value === null || !Number.isFinite(value) ? '—' : value.toLocaleString('ja-JP', { maximumFractionDigits: 4 });
const reference = 'https://www.fhwa.dot.gov/engineering/hydraulics/pubs/08090/HDS4_608.pdf';
type Case = { id: string; name: string; source: string; input: DrainageInput; version: string };
const applicability = '定常等流・自然流下の単一断面を照査します。流速と余裕高は指定した照査水深での値です。計画流量に対応する等流水深の逆算、水路網、背水、入口損失、圧力流は対象外です。';

export default function Drainage() {
  const [input, setInput] = useState(drainageExample);
  const [name, setName] = useState('排水の計算例');
  const [source, setSource] = useState('サンプル値');
  const [cases, setCases] = useState<Case[]>([]);
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const result = calculateDrainage(input);
  const valid = !!result.values;
  const activeFields = drainageFields.filter(([key]) => input.shape === 'circle' ? !['width', 'height'].includes(key) : key !== 'diameter');
  const baseline = cases.find(item => item.id === selected);
  const previous = baseline ? calculateDrainage(baseline.input) : null;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(stored)) setCases(stored.filter((item: Case) => item?.input && typeof item.id === 'string' && typeof item.name === 'string' && calculateDrainage(item.input).values));
    } catch {
      setNotice('保存条件を読み込めませんでした。');
    }
    setReady(true);
  }, []);

  function save() {
    if (!valid) return;
    const item = { id: crypto.randomUUID(), name: name.trim() || '名称未設定', source, input, version: drainageVersion };
    const next = [...cases, item];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setCases(next);
      setSelected(item.id);
      setNotice('入力条件と降雨・粗度・判定基準の出典を保存しました。');
    } catch {
      setNotice('このブラウザでは条件を保存できませんでした。');
    }
  }

  const summary = drainageResults.map(([key, label, formula, unit]) => [label, formula, result.values?.[key] ?? null, unit] as const);

  function exportCsv() {
    if (!valid) return;
    const rows = [
      ['検討名', name], ['降雨・粗度・判定基準の出典', source], ['計算モデル', drainageVersion],
      ...activeFields.map(([key, label, unit]) => [label, input[key], unit]),
      ...summary.map(([label, formula, value, unit]) => [label, value ?? '未判定', unit, formula]),
      ['断面形式', input.shape === 'circle' ? '円管' : '矩形側溝'],
      ...result.checks.map(check => [check.label, check.value, check.criterion, check.limit, check.ok ? 'OK' : 'NG']), ['適用範囲', applicability],
    ];
    const quote = (value: string | number) => {
      const safe = typeof value === 'string' && /^[\s]*[=+\-@]/.test(value) ? "'" + value : String(value);
      return '"' + safe.replaceAll('"', '""') + '"';
    };
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '排水計算-照査.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  return (
    <main className="foundation drainage">
      <div className="title-row">
        <div><h1>排水の流下能力照査</h1><p className="subtitle">合理式 · Manning式 · 矩形側溝・円管</p></div>
        <div className="actions">
          <button disabled={!valid} onClick={exportCsv}>CSV出力</button>
          <button disabled={!valid} onClick={() => window.print()}>PDF出力</button>
          <button className="primary" disabled={!valid || !ready} onClick={save}>条件を保存</button>
        </div>
      </div>
      <p className="notice-model">{applicability} 流速基準・必要余裕高の初期値は仮設定です。案件の採用基準に合わせて変更してください。</p>
      {notice && <p className="toast" role="status">{notice}</p>}
      <div className="work-grid">
        <section className="main-column">
          <div className="panel">
            <div className="panel-heading"><h2>設計条件</h2></div>
            <p>断面形式 {input.shape === 'circle' ? '円管（部分充満）' : '矩形側溝'} · {drainageVersion}</p>
            <label className="compare-select drainage-shape">断面形式<select value={input.shape} onChange={event => setInput(current => ({ ...current, shape: event.target.value as DrainageInput['shape'] }))}><option value="rectangle">矩形側溝</option><option value="circle">円管（部分充満）</option></select></label>
            <div className="input-grid">
              <label className="field"><span>検討名</span><div><input value={name} onChange={event => setName(event.target.value)} /></div></label>
              <label className="field"><span>降雨・粗度・判定基準の出典</span><div><input value={source} onChange={event => setSource(event.target.value)} /></div></label>
              {activeFields.map(([key, label, unit]) => (
                <label className="field" key={key}><span>{label}</span>
                  <div><input type="number" step="any" value={Number.isFinite(input[key]) ? input[key] : ''} onChange={event => {
                    const value = event.target.value;
                    setInput(current => ({ ...current, [key]: value === '' ? NaN : Number(value) }));
                  }} /><small>{unit}</small></div>
                </label>
              ))}
            </div>
            <p className="field-note">集水面積はha、勾配はm/mで入力します（0.5% = 0.005）。降雨強度は採用確率年・流達時間に対応する値を設定してください。円管の照査水深は内径未満です。</p>
          </div>
          <div className="panel">
            <div className="panel-heading"><h2>計算過程</h2><span className="muted">{drainageVersion}</span></div>
            {valid ? <>
              <div className="table-wrap"><table><thead><tr><th>項目</th><th>式</th><th>計算値</th></tr></thead>
                <tbody>{summary.map(([label, formula, value, unit]) => <tr key={label}><td>{label}</td><td>{formula}</td><td>{format(value)} {unit}</td></tr>)}</tbody>
              </table></div>
              <p className="field-note">円管は θ = 2 acos(1 − 2y/D)（rad）。水面幅を潤辺に含めません。計画流量はha・mm/hをm³/sへ換算しています。</p>
            </> : <div role="alert">{result.errors.map(error => <p className="error" key={error}>{error}</p>)}</div>}
            <p className="field-note"><a href={reference} target="_blank" rel="noreferrer">参考資料 FHWA HDS-4（合理式・等流計算）</a></p>
          </div>
        </section>
        <aside className="results">
          <div className="panel summary">
            <div className="summary-top"><h2>照査結果</h2></div>
            {!valid && <p>入力条件を確認してください。</p>}
            {result.checks.map(check => <div className="check" key={check.label}>
              <div><b>{check.label}</b><em className={check.ok ? 'ok' : 'ng'}>{check.ok ? 'OK' : 'NG'}</em></div>
              <div className="check-number">{format(check.value)} <small>{check.unit}</small></div>
              <small>{check.criterion} {format(check.limit)} {check.unit}</small>
            </div>)}
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
              <p className="field-note">比較基準の断面 {baseline.input.shape === 'circle' ? '円管' : '矩形側溝'}</p><p className="field-note">保存条件の出典 {baseline.source || '未入力'}</p>
              <table><thead><tr><th>項目</th><th>保存値</th><th>差分</th></tr></thead>
                <tbody>
                  {activeFields.map(([key]) => <tr key={key}><td>{key}</td><td>{format(baseline.input[key])}</td><td>{format(valid ? input[key] - baseline.input[key] : null)}</td></tr>)}
                  {drainageResults.map(([key, label]) => <tr key={key}><td>{label}</td><td>{format(previous.values?.[key] ?? null)}</td><td>{format(result.values && previous.values ? result.values[key] - previous.values[key] : null)}</td></tr>)}
                </tbody></table>
              <button className="foundation-load" onClick={() => { setInput(baseline.input); setName(baseline.name); setSource(baseline.source); setNotice('保存条件を読み込みました。'); }}>この条件を読み込む</button>
            </>}
          </div>
        </aside>
      </div>
    </main>
  );
}
