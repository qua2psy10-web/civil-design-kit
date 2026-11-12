export type Params=Record<string,number>;
export const defaults:Params={H:4,t1:.4,B:3.2,t2:.45,Bf:.6,D:.45,Hb:1,beta:0,gamma:19,phi:30,c:0,delta:0,q:10,gammaC:24,phiF:30,cF:0,gammaF:19,mu:.6,overturn:1.5,slide:1.5,bearing:3,eDiv:6};
export const fields:[string,string,string][]=[['H','竪壁高さ','m'],['t1','竪壁厚','m'],['B','底版幅','m'],['t2','底版厚','m'],['Bf','つま先幅','m'],['D','基礎根入れ深さ','m'],['Hb','背面盛土の最大上昇高','m'],['beta','背面勾配 β','°'],['gamma','土の単位体積重量 γ','kN/m³'],['phi','内部摩擦角 φ','°'],['c','粘着力 c','kN/m²'],['delta','壁面摩擦角 δ','°'],['q','上載荷重 q','kN/m²'],['gammaC','コンクリート γC','kN/m³'],['phiF','基礎地盤の摩擦角 φf','°'],['cF','基礎地盤の粘着力 cf','kN/m²'],['gammaF','基礎地盤の単位体積重量','kN/m³'],['mu','底面摩擦係数 μ','−'],['overturn','転倒安全率の下限','−'],['slide','滑動安全率の下限','−'],['bearing','支持力安全率の下限','−'],['eDiv','偏心許容値 B / n：n','−']];
export const engineVersion='RW-1.0 / 常時・仮想背面モデル';
export function calculate(p:Params){
 const errors:string[]=[];for(const [k,label] of fields)if(!Number.isFinite(p[k]))errors.push(`${label}を入力してください。`);
 for(const k of ['H','t1','B','t2','gamma','gammaC','gammaF','overturn','slide','bearing','eDiv'])if(p[k]<=0)errors.push(`${k} は正の値が必要です。`);
 for(const k of ['Bf','D','Hb','beta','q','c','cF','mu'])if(p[k]<0)errors.push(`${k} は0以上が必要です。`);
 if(p.Bf+p.t1>=p.B)errors.push('B > Bf + t1 としてください（かかと版が必要です）。');
 if(p.phi<=0||p.phi>=45||p.phiF<0||p.phiF>=45)errors.push('φ は0°超45°未満、φf は0°以上45°未満にしてください。');
 if(p.beta>=p.phi||p.delta<0||p.delta>p.phi)errors.push('0 ≤ β < φ、0 ≤ δ ≤ φ としてください。');
 if(p.D>p.t2)errors.push('本モデルの根入れ D は底版厚 t2 以下に限定します。');
 if(p.beta>0&&p.Hb<=0)errors.push('勾配がある場合は Hb > 0 が必要です。');
 if(p.eDiv<6)errors.push('全面接地を照査するため n は6以上としてください。');
 if(errors.length)return{errors,values:{} as Params,checks:[] as {key:string;label:string;value:number;limit:number;ok:boolean;unit:string}[],weights:[] as {name:string;w:number;x:number}[],type:''};
 const r=Math.PI/180, ph=p.phi*r,de=p.delta*r,be=p.beta*r,L=p.B-p.Bf-p.t1;
 const Ka=Math.cos(ph)**2/(Math.cos(de)*(1+Math.sqrt(Math.sin(ph+de)*Math.sin(ph-be)/(Math.cos(de)*Math.cos(be))))**2);
 // Virtual vertical plane at heel; local slope at plane, conservative continuation beyond cap.
 const rise=Math.min(L*Math.tan(be),p.Hb), h=p.H+rise;
 const cut=p.beta===0?L:Math.min(L,p.Hb/Math.tan(be));
 const area=.5*Math.tan(be)*cut**2+rise*(L-cut);
 const first=Math.tan(be)*cut**3/3+rise*(L**2-cut**2)/2;
 const weights=[{name:'W1 竪壁',w:p.H*p.t1*p.gammaC,x:p.Bf+p.t1/2},{name:'W2 底版',w:p.B*p.t2*p.gammaC,x:p.B/2},{name:'W3 背面土（矩形）',w:p.H*L*p.gamma,x:p.Bf+p.t1+L/2},{name:'W4 背面土（盛土）',w:area*p.gamma,x:area? p.Bf+p.t1+first/area:p.B}];
 const Pa=.5*Ka*p.gamma*h*h,Paq=Ka*p.q*h,Ph=(Pa+Paq)*Math.cos(de),Pv=(Pa+Paq)*Math.sin(de);
 const V=weights.reduce((s,w)=>s+w.w,0)+Pv,Mr=weights.reduce((s,w)=>s+w.w*w.x,0)+Pv*p.B,Mo=Math.cos(de)*(Pa*(p.t2+h/3)+Paq*(p.t2+h/2));
 const Fs_overturn=Mr/Mo,Fs_slide=V*p.mu/Ph,e=p.B/2-(Mr-Mo)/V,B_eff=p.B-2*Math.abs(e);
 const qmin=V/p.B*(1-6*Math.abs(e)/p.B);
 const contact=3*(p.B/2-Math.abs(e));
 const qmax=Math.abs(e)<=p.B/6?V/p.B*(1+6*Math.abs(e)/p.B):contact>0?2*V/contact:Infinity;
 const f=p.phiF*r,Nq=f===0?1:Math.exp(Math.PI*Math.tan(f))*Math.tan(Math.PI/4+f/2)**2,Nc=f===0?Math.PI+2:(Nq-1)/Math.tan(f),Ng=2*(Nq+1)*Math.tan(f);
 // Vesic strip footing capacity, inclination reductions explicitly applied.
 const iq=Math.max(0,1-Ph/V)**2,ic=f===0?Math.max(0,1-Ph/(Math.max(B_eff,0.0001)*Math.max(p.cF,0.0001))):Math.max(0,iq-(1-iq)/(Nq-1)),ig=Math.max(0,1-Ph/V)**3;
 const qu=B_eff>0?p.cF*Nc*ic+p.gammaF*p.D*Nq*iq+.5*p.gammaF*B_eff*Ng*ig:0;
 const demand=B_eff>0?V/B_eff:Infinity,Fs_bearing=qu/demand;
 const values:Params={Ka,L,rise,h,Pa,Paq,Ph,Pv,V,Mr,Mo,Fs_overturn,Fs_slide,e,B_eff,qmin,qmax,Nq,Nc,Ng,iq,ic,ig,qu,demand,Fs_bearing,...Object.fromEntries(weights.map((w,i)=>['W'+(i+1),w.w]))};
 const checks=[{key:'Fs_overturn',label:'転倒',value:Fs_overturn,limit:p.overturn,ok:Fs_overturn>=p.overturn,unit:''},{key:'Fs_slide',label:'滑動',value:Fs_slide,limit:p.slide,ok:Fs_slide>=p.slide,unit:''},{key:'Fs_bearing',label:'支持力',value:Fs_bearing,limit:p.bearing,ok:Fs_bearing>=p.bearing&&B_eff>0,unit:''},{key:'e',label:'偏心',value:Math.abs(e),limit:p.B/p.eDiv,ok:Math.abs(e)<=p.B/p.eDiv,unit:'m'}];
 return{errors,values,checks,weights,type:p.Bf<.001?'L型':'逆T型'};
}
export const formulas=[['Ka','cos²φ / {cosδ [1 + √(sin(φ+δ) sin(φ−β)/(cosδ cosβ))]²}'],['Pa','Ka γ h² / 2'],['Paq','Ka q h'],['Ph','(Pa + Paq) cosδ'],['Pv','(Pa + Paq) sinδ'],['Mr','Σ(Wi xi) + Pv B'],['Mo','cosδ {Pa(t2+h/3) + Paq(t2+h/2)}'],['Fs_overturn','Mr / Mo'],['Fs_slide','μ V / Ph（底面粘着・前面受働抵抗は算入しない）'],['e','B/2 − (Mr−Mo)/V'],['B_eff','B − 2|e|'],['qmax','全面接地：V/B (1+6|e|/B)、部分接地：2V/{3(B/2−|e|)}'],['qu','cf Nc ic + γf D Nq iq + 0.5 γf B_eff Nγ iγ'],['Fs_bearing','qu / (V/B_eff)'],['Nq','exp(π tanφf) tan²(π/4+φf/2)'],['Nc','(Nq−1)/tanφf、φf=0 のとき π+2'],['Ng','Nγ = 2(Nq+1)tanφf（Vesic）'],['iq','[max(0, 1−Ph/V)]²'],['ic','max(0, iq−(1−iq)/(Nq−1))、φf=0：max(0,1−Ph/(B_eff cf))'],['ig','iγ = [max(0, 1−Ph/V)]³']];
