import {test,expect} from '@playwright/test';
const header=['STT','Q','VN','Đáp án','Note'];
const rows=[header,
 ['1','Trong giai đoạn nào, tính khả kiểm thử của yêu cầu được đánh giá?','A. Thiết kế kiểm thử\nB. Phân tích kiểm thử\nC. Thực thi kiểm thử\nD. Lập kế hoạch kiểm thử','B','Giải thích câu 1'],
 ['2','Test case thường bao gồm những gì?','A. Chỉ tên chức năng\nB. Chỉ lịch kiểm thử\nC. Điều kiện, đầu vào, hành động và kết quả mong đợi\nD. Chỉ danh sách lỗi','C','Giải thích câu 2']];
async function mockSheet(page,chapters){
 await page.route('https://sheets.googleapis.com/**',async route=>{
  const url=new URL(route.request().url());
  if(!url.pathname.includes('/values/'))return route.fulfill({json:{sheets:chapters.map((c,i)=>({properties:{sheetId:i,title:c.title,gridProperties:{rowCount:c.rows.length,columnCount:5}}}))}});
  const range=decodeURIComponent(url.pathname.split('/values/')[1]);
  const chapter=chapters.find(c=>range.startsWith("'"+c.title+"'!"));
  await route.fulfill({json:{values:chapter?.rows||[]}});
 });
}
test('học mẫu, lưu sau trả lời, hoàn thành và ôn sai',async({page})=>{
 await mockSheet(page,[{title:'Chương mẫu',rows}]);
 await page.goto('/');
 await page.getByRole('button',{name:'Bắt đầu học'}).click();
 await page.getByRole('button',{name:/A Thiết kế/}).click();
 await expect(page.getByRole('status')).toContainText('Chưa đúng');
 await page.screenshot({path:'test-results/mobile-study.png',fullPage:true});
 await page.reload();
 await expect(page.getByRole('status')).toContainText('Đáp án đúng: B');
 await page.getByRole('button',{name:'Câu tiếp theo'}).click();
 await page.getByRole('button',{name:/C Điều kiện/}).click();
 await page.getByRole('button',{name:'Xem kết quả'}).click();
 await expect(page.getByRole('heading',{name:'Bạn đã hoàn thành lượt học!'})).toBeVisible();
 await expect(page.getByText('50% chính xác.',{exact:false})).toBeVisible();
 await page.getByRole('link',{name:'Về danh sách chương'}).click();
 await page.getByRole('button',{name:'Ôn 1 câu sai'}).click();
 await page.getByRole('button',{name:/B Phân tích/}).click();
 await page.getByRole('button',{name:'Xem kết quả'}).click();
 await expect(page.getByText('100% chính xác.',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('học Chương4 trước và giữ lượt dở khi chuyển chương; bỏ qua câu lỗi',async({page})=>{
 await mockSheet(page,[{title:'Chương1',rows},{title:'Chương4',rows:[...rows,['3','Thiếu đáp án',rows[1][2],'','']]},{title:'Chương3',rows:[header,['1','Thiếu đáp án',rows[1][2],'','']]}]);
 await page.goto('/');
 const card=title=>page.locator('article').filter({has:page.getByRole('heading',{name:title,exact:true})});
 await expect(card('Chương3').getByRole('button',{name:'Bắt đầu học'})).toBeDisabled();
 await card('Chương4').getByRole('button',{name:'Bắt đầu học'}).click();
 await expect(page.getByText('Câu 1/2',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/B Phân tích/}).click();
 await page.getByRole('link',{name:'Danh sách chương'}).click();
 await card('Chương1').getByRole('button',{name:'Bắt đầu học'}).click();
 await page.getByRole('link',{name:'Danh sách chương'}).click();
 await card('Chương4').getByRole('link',{name:'Học tiếp'}).click();
 await expect(page.locator('.feedback')).toContainText('Chính xác');
 await page.getByRole('button',{name:'Câu tiếp theo'}).click();
 await page.getByRole('button',{name:/C Điều kiện/}).click();
 await page.getByRole('button',{name:'Xem kết quả'}).click();
 await expect(page.getByRole('button',{name:'Làm lại, đảo câu'})).toBeEnabled();
});
