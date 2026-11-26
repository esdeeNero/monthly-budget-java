const form=document.querySelector('#budget'),result=document.querySelector('#result');
const rub=cents=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(cents/100);
const row=(label,value)=>`<div class="row"><span>${label}</span><b>${rub(value)}</b></div>`;
async function calculate(event){
  event?.preventDefault();if(!form.reportValidity())return;
  const button=form.querySelector('button');button.disabled=true;
  try{
    const response=await fetch('/api/plan',{method:'POST',body:new URLSearchParams(new FormData(form))});
    const p=await response.json();if(!response.ok)throw new Error(p.error||'Не удалось рассчитать план');
    const achieved=p.remaining===0,ok=p.free>=0;
    const status=achieved?'Цель уже накоплена':ok?'Цель достижима':'План нужно скорректировать';
    let advice=achieved?'Нужная сумма уже есть. Можно выбрать новую цель.':ok?'После обязательных расходов и резерва денег хватает на цель в указанный срок.':p.available>0?`Для этой цели понадобится минимум ${p.possibleMonths} мес., если направить весь доступный остаток в накопления. Либо сократи расходы или увеличь доход.`:'После расходов и резерва денег на цель не остаётся. Сначала пересмотри бюджет.';
    if(achieved&&!ok)advice+=' При этом в месячном бюджете есть дефицит.';
    const payout=(title,s,e,r,f)=>`<div class="payout"><h3>${title}</h3>${row('На цель',s)}${row('На обязательные расходы',e)}${row('В резерв',r)}${row(f<0?'Не хватает':'Остаётся',Math.abs(f))}</div>`;
    const colors=['#80a58c','#bdd98d','#edcb89','#426b59'];
    const values=[p.expenses,p.saving,p.reserve,Math.max(0,p.free)],total=values.reduce((a,b)=>a+b,0);
    result.innerHTML=`<section class="card hero"><span class="badge ${ok?'':'warn'}">${status}</span><p class="sub" id="goal-title"></p><div class="big">${rub(p.saving)}</div><div class="sub">откладывать на цель каждый месяц</div></section><section class="card"><h2>Твой месячный баланс</h2>${row('Доход',p.income)}${row('Обязательные расходы',p.expenses)}${row('Резерв на непредвиденное',p.reserve)}${row('На цель',p.saving)}${row(ok?'На свободные траты':'Дефицит в месяц',Math.abs(p.free))}<div class="bar" aria-hidden="true">${values.map((v,i)=>`<span style="width:${total?v/total*100:0}%;background:${colors[i]}"></span>`).join('')}</div><div class="legend">${['Расходы','Цель','Резерв','Свободно'].map((v,i)=>`<span><i style="background:${colors[i]}"></i>${v}</span>`).join('')}</div><p class="notice">${advice}</p>${ok?`<p class="sub">Свободные траты: около ${rub(Math.floor(p.free/30.44))} в день в среднем. Продукты и транспорт уже учтены отдельно.</p>`:''}</section><section class="card"><h2>С каждой выплаты</h2><p class="sub">Распределяем пропорционально доходу. Даты платежей здесь не учитываются.</p>${payout('Первая зарплата',p.firstSaving,p.firstExpenses,p.firstReserve,p.firstFree)}${payout('Вторая зарплата',p.secondSaving,p.secondExpenses,p.secondReserve,p.secondFree)}</section><div class="actions"><button id="save" type="button">Сохранить в браузере</button><button id="clear" type="button">Удалить сохранённое</button></div><p id="storage-status" class="sub" role="status"></p>`;
    document.querySelector('#goal-title').textContent=form.elements.namedItem('title').value||'Твоя цель';
    document.querySelector('#save').onclick=()=>{try{localStorage.setItem('monthly-budget-v1',JSON.stringify(Object.fromEntries(new FormData(form))));document.querySelector('#storage-status').textContent='Сохранено только в этом браузере.';}catch{document.querySelector('#storage-status').textContent='Браузер не разрешил сохранение.';}};
    document.querySelector('#clear').onclick=()=>{try{localStorage.removeItem('monthly-budget-v1');document.querySelector('#storage-status').textContent='Сохранённые данные удалены. Поля на экране оставлены.';}catch{document.querySelector('#storage-status').textContent='Не удалось удалить данные.';}};
  }catch(error){result.replaceChildren();const box=document.createElement('div');box.className='card error';box.textContent=error.message;result.append(box);}
  finally{button.disabled=false;}
}
try{const data=JSON.parse(localStorage.getItem('monthly-budget-v1')||'null');if(data)for(const[key,value]of Object.entries(data))if(form.elements.namedItem(key))form.elements.namedItem(key).value=value;}catch{}
form.addEventListener('submit',calculate);calculate();
