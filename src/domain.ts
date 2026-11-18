export type Question = { id:string; order:string; text:string; options:string[]; answer:number; note:string; revision:string };
export type Chapter = { id:string; title:string; questions:Question[]; errors:string[]; fetchedAt:number };
export type Session = { chapterId:string; title:string; questions:Question[]; answers:(number|null)[]; index:number; mode:'full'|'wrong'; complete:boolean };
export type Records = Record<string,{revision:string; correct:boolean}>;
// Invalid rows are already excluded by parseChapter. Warnings must not lock
// the remaining questions, nor depend on progress in any other chapter.
export function canStudy(chapter:Chapter) { return chapter.questions.length>0; }
export function fingerprint(s:string) { let h=2166136261; for(let i=0;i<s.length;i++) h=Math.imul(h^s.charCodeAt(i),16777619); return (h>>>0).toString(16); }
export function optionsFrom(text:string):string[] {
 const combined:string[][]=[[],[],[],[]];
 for(const part of text.replace(/\r/g,'').split(/^\s*===\s*$/m)) {
  const lines=part.split('\n'); const buckets:string[][]=[[],[],[],[]]; let current=-1;
  for(let i=0;i<lines.length;i++) {
   const line=lines[i]; const m=line.match(/^\s*([A-Da-d])[.)]\s*(.*)$/);
   if(m) {
    const n=m[1].toUpperCase().charCodeAt(0)-65;
    if(!m[2].trim() && lines.slice(i+1).find(l=>l.trim())?.match(new RegExp('^\\s*'+m[1]+'[.)]\\s*\\S','i'))) continue;
    if(buckets[n].length) throw new Error('Nhãn lựa chọn bị lặp');
    current=n; buckets[n].push(m[2]);
   } else if(line.trim()) { if(current<0) throw new Error('Lựa chọn cần nhãn A. / B. / C. / D.'); buckets[current].push(line); }
  }
  if(buckets.some(b=>!b.join('\n').trim())) throw new Error('Cần đủ bốn lựa chọn có nhãn A–D');
  buckets.forEach((b,i)=>combined[i].push(b.join('\n').trim()));
 }
 return combined.map(b=>b.join('\n\n'));
}
export function parseChapter(id:string,title:string,rows:string[][]):Chapter {
 const result:Chapter={id,title,questions:[],errors:[],fetchedAt:Date.now()};
 const headers=(rows[0]||[]).map(s=>s.trim());
 const required=['STT','Q','VN','Đáp án','Note'];
 const missing=required.filter(h=>!headers.includes(h));
 if(missing.length) {result.errors.push('Thiếu cột: '+missing.join(', '));return result;}
 if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length) {result.errors.push('Header bị trùng');return result;}
 const seen=new Set<string>();
 rows.slice(1).forEach((row,i)=>{
  const get=(h:string)=>(row[headers.indexOf(h)]||'').trim();
  if(!get('Q') && !get('VN') && !get('Đáp án') && !get('Note')) return;
  try {
   if(!get('Q') || !get('STT')) throw new Error('Thiếu STT hoặc câu hỏi');
   const key=get('ID')||get('STT'); if(seen.has(key)) throw new Error('ID/STT bị trùng'); seen.add(key);
   const options=optionsFrom(get('VN')); const answer='ABCD'.indexOf(get('Đáp án').toUpperCase());
   if(answer<0 || get('Đáp án').length!==1) throw new Error('Đáp án phải là A/B/C/D');
   const text=get('Q'); result.questions.push({id:id+':'+key,order:get('STT'),text,options,answer,note:get('Note'),revision:fingerprint(JSON.stringify([text,options,answer]))});
  } catch(e) {result.errors.push(`Dòng ${i+2}: ${(e as Error).message}`);}
 });
 result.questions.sort((a,b)=>a.order.localeCompare(b.order,undefined,{numeric:true})); return result;
}
export function shuffle<T>(items:T[]):T[] {const out=[...items]; for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];} if(out.length>1&&out.every((x,i)=>x===items[i])) out.push(out.shift()!);return out;}
export function start(chapter:Chapter,mode:Session['mode']='full',records:Records={},random=false):Session {
 let questions=chapter.questions.filter(q=>mode==='full'||(records[q.id]?.revision===q.revision&&!records[q.id].correct));
 if(random) questions=shuffle(questions);
 return {chapterId:chapter.id,title:chapter.title,questions,answers:questions.map(()=>null),index:0,mode,complete:false};
}
export function answerSession(s:Session,choice:number):Session {if(s.complete||s.answers[s.index]!==null)return s;return {...s,answers:s.answers.map((a,i)=>i===s.index?choice:a)};}
export function score(s:Session) {return s.answers.filter((a,i)=>a!==null&&a===s.questions[i].answer).length;}
