const { neon } = require('@neondatabase/serverless');

function db(){
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if(!url) throw new Error('No Neon/Postgres connection string configured in Vercel.');
  return neon(url);
}

async function ensure(sql){
  await sql`create table if not exists ehood_messages (
    id bigserial primary key,
    channel_key text not null,
    user_id text not null,
    username text not null,
    avatar text,
    text text not null default '',
    image text,
    image_name text,
    created_at timestamptz not null default now(),
    edited boolean not null default false
  )`;
  await sql`create index if not exists ehood_messages_channel_created_idx on ehood_messages(channel_key, created_at)`;
}

module.exports = async (req,res)=>{
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma','no-cache');
  res.setHeader('Expires','0');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(204).end();
  try{
    const sql=db();
    await ensure(sql);
    if(req.method==='GET'){
      const channel=String(req.query.channel||'ehood:general').slice(0,200);
      const rows=await sql`select id,channel_key,user_id,username,avatar,text,image,image_name,created_at,edited from ehood_messages where channel_key=${channel} order by created_at desc limit 200`;
      return res.status(200).json(rows.reverse());
    }
    if(req.method==='POST'){
      const b=req.body||{};
      const channel=String(b.channel_key||'').slice(0,200), uid=String(b.user_id||'').slice(0,200), username=String(b.username||'User').slice(0,40), text=String(b.text||'').slice(0,4000);
      if(!channel||!uid||(!text&&!b.image)) return res.status(400).json({error:'Missing message'});
      const rows=await sql`insert into ehood_messages(channel_key,user_id,username,avatar,text,image,image_name) values(${channel},${uid},${username},${b.avatar||null},${text},${b.image||null},${b.image_name||null}) returning id,channel_key,user_id,username,avatar,text,image,image_name,created_at,edited`;
      return res.status(201).json(rows[0]);
    }
    if(req.method==='PATCH'){
      const id=Number(req.body?.id),uid=String(req.body?.user_id||'');
      const text=String(req.body?.text||'').slice(0,4000);
      if(!id||!uid||!text) return res.status(400).json({error:'Invalid edit'});
      const rows=await sql`update ehood_messages set text=${text}, edited=true where id=${id} and user_id=${uid} returning *`;
      return rows[0]?res.status(200).json(rows[0]):res.status(403).json({error:'Not your message'});
    }
    if(req.method==='DELETE'){
      const id=Number(req.body?.id),uid=String(req.body?.user_id||'');
      if(!id||!uid) return res.status(400).json({error:'Invalid delete'});
      const rows=await sql`delete from ehood_messages where id=${id} and user_id=${uid} returning id`;
      return rows[0]?res.status(200).json(rows[0]):res.status(403).json({error:'Not your message'});
    }
    return res.status(405).json({error:'Method not allowed'});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:e.message||'Chat server error'});
  }
};
