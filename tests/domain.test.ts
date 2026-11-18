import {describe,it,expect} from 'vitest';
import {parseChapter,optionsFrom,start,answerSession,score,shuffle,canStudy} from '../src/domain';
const opts='A. một\nB. hai\nC. ba\nD. bốn';
describe('nguồn câu hỏi',()=>{
 it('ghép song ngữ và bỏ nhãn dư',()=>expect(optionsFrom(opts+'\n===\na.\nA. one\nb.\nB. two\nc.\nC. three\nd.\nD. four')).toEqual(['một\n\none','hai\n\ntwo','ba\n\nthree','bốn\n\nfour']));
 it('hỗ trợ nhãn nhỏ trên dòng riêng',()=>expect(optionsFrom('a.\none\nb.\ntwo\nc.\nthree\nd.\nfour')).toEqual(['one','two','three','four']));
 it('không đoán lựa chọn không nhãn',()=>expect(()=>optionsFrom('one\ntwo\nthree\nfour')).toThrow());
 it('map header và gid 0, bỏ STT rỗng, báo trùng',()=>{const c=parseChapter('0','Chương3',[['Note','Đáp án','VN','Q','STT'],['','B',opts,'Q','1'],['','','','','2'],['','A',opts,'Other','1']]);expect(c.questions).toHaveLength(1);expect(c.questions[0].id).toBe('0:1');expect(c.errors[0]).toContain('trùng');});
 it('không lấy đáp án từ Note',()=>expect(parseChapter('0','C',[['STT','Q','A','Note'],['1','Q',opts,'chọn B']]).errors[0]).toContain('Thiếu cột'));
});
describe('lượt học',()=>{
 it('chương có câu lỗi vẫn học các câu hợp lệ, không phụ thuộc chương khác',()=>{
  const chapter=parseChapter('4','Chương4',[['STT','Q','VN','Đáp án','Note'],['1','Hợp lệ',opts,'B',''],['2','Thiếu đáp án',opts,'','']]);
  expect(chapter.errors).toHaveLength(1);
  expect(canStudy(chapter)).toBe(true);
  expect(start(chapter).questions.map(q=>q.text)).toEqual(['Hợp lệ']);
  const empty=parseChapter('3','Chương3',[['STT','Q','VN','Đáp án','Note'],['1','Lỗi',opts,'','']]);
  expect(canStudy(empty)).toBe(false);
 });
 const chapter=parseChapter('1','C',[['STT','Q','VN','Đáp án','Note'],['1','Q',opts,'B','N']]);
 it('chấm lần đầu, không ghi đè khi click lặp',()=>{const a=answerSession(start(chapter),1);expect(score(a)).toBe(1);expect(answerSession(a,0)).toBe(a);});
 it('ôn sai theo revision',()=>{const q=chapter.questions[0];expect(start(chapter,'wrong',{[q.id]:{revision:q.revision,correct:false}}).questions).toHaveLength(1);expect(start(chapter,'wrong',{[q.id]:{revision:'old',correct:false}}).questions).toHaveLength(0);});
 it('sửa Note giữ revision',()=>{const changed=parseChapter('1','C',[['STT','Q','VN','Đáp án','Note'],['1','Q',opts,'B','new']]);expect(changed.questions[0].revision).toBe(chapter.questions[0].revision);});
 it('shuffle đủ phần tử và khác thứ tự',()=>{for(let i=0;i<30;i++){const s=shuffle([1,2,3]);expect(s).not.toEqual([1,2,3]);expect([...s].sort()).toEqual([1,2,3]);}});
});
