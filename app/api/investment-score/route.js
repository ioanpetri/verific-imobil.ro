import {NextResponse} from 'next/server';
import {investmentV35} from '../../lib/investment-v35';
export const runtime='nodejs';
export async function POST(request){
  try{
    const raw=await request.text();
    if(raw.length>100000)return NextResponse.json({error:'Date prea voluminoase'}, {status:413});
    const input=JSON.parse(raw);
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Corpul cererii trebuie sa fie obiect JSON');
    return NextResponse.json(investmentV35(input));
  }catch(e){return NextResponse.json({error:String(e.message||'Date invalide')},{status:400});}
}
