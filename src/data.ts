import { parseChapter, type Chapter } from './domain';
export const sheetId=import.meta.env.VITE_GOOGLE_SHEETS_ID||'1yBe0N4PZ0aECYvzEjGCc1oiGxvCIqAqDilA1KZ40gX4';
const apiKey=import.meta.env.VITE_GOOGLE_API_KEY;
export const configured=!!apiKey;
export const namespace='istqb:v1:'+sheetId;
export function read<T>(key:string,fallback:T,valid?:(v:unknown)=>boolean):T {try{const v=JSON.parse(localStorage.getItem(namespace+key)||'null');return v!==null&&(!valid||valid(v))?v:fallback;}catch{return fallback;}}
export function write(key:string,value:unknown):boolean {try{localStorage.setItem(namespace+key,JSON.stringify(value));return true;}catch{return false;}}
async function request(path:string,params:URLSearchParams,attempt=0):Promise<any> {
 params.set('key',apiKey); let response:Response;
 try {response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}?${params}`,{signal:AbortSignal.timeout(15000)});}catch{throw new Error('Không kết nối được nguồn dữ liệu. Kiểm tra mạng rồi thử lại.');}
 if((response.status===429||response.status>=500)&&attempt<2){await new Promise(r=>setTimeout(r,700*2**attempt));return request(path,params,attempt+1);}
 if(!response.ok) throw new Error(response.status===403||response.status===401?'Nguồn dữ liệu chưa cho phép truy cập. Xem hướng dẫn cấu hình trong README.':`Không tải được nội dung (HTTP ${response.status}). Vui lòng thử lại.`);
 return response.json();
}
export async function loadChapters():Promise<Chapter[]> {
 const metadata=await request('',new URLSearchParams({fields:'sheets(properties(sheetId,title,index,hidden,gridProperties))'}));
 const sheets=metadata.sheets.map((s:any)=>s.properties).filter((p:any)=>!p.hidden&&!p.title.startsWith('_')&&p.gridProperties);
 const chapters:Chapter[]=[];
 for(const p of sheets) {
  const rows:string[][]=[]; const title="'"+p.title.replace(/'/g,"''")+"'";
  // Bounded pages follow current grid size, including newly inserted rows.
  for(let first=1;first<=p.gridProperties.rowCount;first+=500){
   let col='';let count=Math.min(p.gridProperties.columnCount,52);while(count){count--;col=String.fromCharCode(65+count%26)+col;count=Math.floor(count/26);}
   const ranges=`${title}!A${first}:${col}${Math.min(first+499,p.gridProperties.rowCount)}`;
   const data=await request('/values/'+encodeURIComponent(ranges),new URLSearchParams());
   const page=data.values||[]; for(let n=0;n<Math.min(500,p.gridProperties.rowCount-first+1);n++)rows.push(page[n]||[]);
  }
  chapters.push(parseChapter(String(p.sheetId),p.title,rows));
 }
 return chapters.sort((a,b)=>{const x=a.title.match(/^Chương\s*(\d+)$/i),y=b.title.match(/^Chương\s*(\d+)$/i);return x&&y?+x[1]-+y[1]:x?-1:y?1:0;});
}
export const demo:Chapter[]= [parseChapter('sample','Chương mẫu',[
 ['STT','Q','VN','Đáp án','Note'],
 ['1','Trong giai đoạn nào, tính khả kiểm thử của yêu cầu được đánh giá?','A. Thiết kế kiểm thử\nB. Phân tích kiểm thử\nC. Thực thi kiểm thử\nD. Lập kế hoạch kiểm thử','B','Phân tích kiểm thử bao gồm đánh giá khả năng kiểm thử của cơ sở kiểm thử.'],
 ['2','Test case thường bao gồm những gì?','A. Chỉ tên chức năng\nB. Chỉ lịch kiểm thử\nC. Điều kiện, đầu vào, hành động và kết quả mong đợi\nD. Chỉ danh sách lỗi','C','Test case mô tả điều kiện tiên quyết, đầu vào, hành động, kết quả mong đợi và điều kiện hậu kiểm.']
])];
