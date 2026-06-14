import { useState } from "react";

export default function AICouncil(){

const [stock,setStock] = useState("NVDA");


const agents=[
{
emoji:"🐯",
name:"Tiger AI",
role:"Trend Master",
text:"วิเคราะห์กราฟ ราคา Momentum และแนวโน้ม",
vote:"BUY",
score:92
},
{
emoji:"🦉",
name:"Owl AI",
role:"Fundamental",
text:"วิเคราะห์รายได้ กำไร และการเติบโต",
vote:"BUY",
score:88
},
{
emoji:"🐺",
name:"Wolf AI",
role:"Risk Manager",
text:"ตรวจความเสี่ยงและจุดป้องกันขาดทุน",
vote:"HOLD",
score:75
},
{
emoji:"🐙",
name:"Octopus AI",
role:"Market Data",
text:"สแกน Volume ข่าว และแรงซื้อขาย",
vote:"BUY",
score:90
},
{
emoji:"🐰",
name:"Bunny AI",
role:"Chief AI",
text:"รวมทุกความเห็นและสรุปผล",
vote:"BUY",
score:94
}
];


const total = Math.round(
agents.reduce((a,b)=>a+b.score,0)
/ agents.length);


return (

<div>


<div className="
bg-gradient-to-r 
from-emerald-900 
to-blue-900 
rounded-2xl 
p-5
mb-5
">

<h1 className="text-3xl font-bold">
🤖 AI STOCK COUNCIL
</h1>

<p>
ทีม AI วิเคราะห์หุ้น 24 ชั่วโมง
</p>


<input

className="
mt-4
bg-black/40
rounded-xl
p-3
w-full
"

value={stock}

onChange={(e)=>setStock(e.target.value)}

/>


</div>



<div className="grid gap-4">


{
agents.map((a,i)=>(

<div
key={i}
className="
bg-[#111827]
border
border-white/10
rounded-2xl
p-5
"
>


<div className="flex gap-4 items-center">

<div className="text-5xl">
{a.emoji}
</div>


<div>

<h2 className="text-xl font-bold">
{a.name}
</h2>

<p className="text-gray-400">
{a.role}
</p>


</div>


</div>



<p className="mt-4">
💬 {a.text}
</p>


<div className="mt-3 flex justify-between">

<span>
คะแนน {a.score}/100
</span>


<span className="
text-emerald-400
font-bold
">

{a.vote}

</span>


</div>



</div>

))

}

</div>




<div className="
mt-5
bg-black
rounded-2xl
p-5
border
border-emerald-500
">


<h2 className="text-2xl font-bold">
🏆 AI สรุปวันนี้
</h2>


<h1 className="
text-5xl
text-emerald-400
mt-3
">

{stock}

</h1>


<p className="text-xl mt-3">
AI Confidence {total}%
</p>


<p className="mt-3">
ทีม AI เห็นด้วย 4/5
</p>


<button
className="
mt-5
bg-emerald-600
rounded-xl
px-8
py-3
font-bold
"
>

วิเคราะห์ใหม่

</button>


</div>


</div>

)

}
