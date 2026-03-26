const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const express = require("express");

const app = express();
const PORT = 3000;

const owner = "18295238227@s.whatsapp.net";
let antiLink = true;
let premiumUsers = [];

app.get("/", (req,res)=>{
  res.send("🤖 BOT ONLINE - SUBZERO X LUFFY ");
});

app.listen(PORT, ()=>{
  console.log("🌐 Web dashboard active");
});

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({ auth: state });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update)=>{
    const { connection, qr } = update;

    if(qr){
      qrcode.generate(qr, {small:true});
    }

    if(connection === "open"){
      console.log("✅ BOT CONNECTED");
    }
  });

  sock.ev.on("messages.upsert", async (m)=>{
    const msg = m.messages[0];
    if(!msg.message) return;

    let from = msg.key.remoteJid;
    let sender = msg.key.participant || msg.key.remoteJid;

    let text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    text = text.toLowerCase();

    // ================= MENU =================
    if(text === ".menu"){
      await sock.sendMessage(from,{
        text:`SUBZERO X LUFFY BOT

.menu
.ping
.time
.ai
.s
.vv
.tagall
.kickall
.antilink on/off
.addpremium
.removepremium
`
      });
    }

    // ================= BASIC =================
    if(text === ".ping"){
      sock.sendMessage(from,{text:"🏓 Pong"});
    }

    if(text === ".time"){
      sock.sendMessage(from,{text:new Date().toLocaleString()});
    }

    // ================= AI STYLE =================
    if(text.startsWith(".ai")){
      let q = text.replace(".ai","");
      sock.sendMessage(from,{
        text:"🤖 AI: Mwen konprann sa ou di 👉 "+q
      });
    }

    // ================= PREMIUM SYSTEM =================
    if(text === ".addpremium"){
      if(sender !== owner) return;
      premiumUsers.push(from);
      sock.sendMessage(from,{text:"💎 User ajoute nan premium"});
    }

    if(text === ".removepremium"){
      if(sender !== owner) return;
      premiumUsers = premiumUsers.filter(u => u !== from);
      sock.sendMessage(from,{text:"❌ retire nan premium"});
    }

    // ================= STICKER =================
    if(text === ".s"){
      let quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if(!quoted) return sock.sendMessage(from,{text:"❌ Reply ak foto"});

      let type = Object.keys(quoted)[0];

      if(type === "imageMessage"){
        let stream = await downloadContentFromMessage(quoted.imageMessage,"image");
        let buffer = Buffer.from([]);

        for await(const chunk of stream){
          buffer = Buffer.concat([buffer,chunk]);
        }

        fs.writeFileSync("temp.jpg", buffer);
        await sock.sendMessage(from,{sticker:{url:"./temp.jpg"}});
        fs.unlinkSync("temp.jpg");
      }
    }

    // ================= AUTO VIEW ONCE =================
    if(msg.message.viewOnceMessage){
      let view = msg.message.viewOnceMessage.message;
      let type = Object.keys(view)[0];

      let stream = await downloadContentFromMessage(view[type],
        type === "imageMessage" ? "image" : "video");

      let buffer = Buffer.from([]);
      for await(const chunk of stream){
        buffer = Buffer.concat([buffer,chunk]);
      }

      fs.writeFileSync("auto.jpg", buffer);
      await sock.sendMessage(from,{
        image:{url:"./auto.jpg"},
        caption:"👁️ Anti View Once"
      });
      fs.unlinkSync("auto.jpg");
    }

    // ================= TAG ALL =================
    if(text === ".tagall"){
      if(!from.endsWith("@g.us")) return;

      let group = await sock.groupMetadata(from);
      let members = group.participants;

      let teks = "📢 TAG ALL\n\n";
      let mentions = [];

      for(let m of members){
        teks += "@"+m.id.split("@")[0]+"\n";
        mentions.push(m.id);
      }

      sock.sendMessage(from,{text:teks, mentions});
    }

    // ================= KICK ALL =================
    if(text === ".kickall"){
      if(sender !== owner) return sock.sendMessage(from,{text:"❌ Owner only"});

      let group = await sock.groupMetadata(from);
      let members = group.participants;

      let targets = [];
      for(let m of members){
        if(m.id !== owner){
          targets.push(m.id);
        }
      }

      await sock.groupParticipantsUpdate(from, targets, "remove");
      sock.sendMessage(from,{text:"💀 DONE"});
    }

    // ================= ANTI LINK =================
    if(text === ".antilink on"){
      antiLink = true;
      sock.sendMessage(from,{text:"🔒 Anti-link ON"});
    }

    if(text === ".antilink off"){
      antiLink = false;
      sock.sendMessage(from,{text:"🔓 Anti-link OFF"});
    }

    if(from.endsWith("@g.us") && text.includes("http") && antiLink){
      if(sender !== owner){
        await sock.groupParticipantsUpdate(from,[sender],"remove");
        sock.sendMessage(from,{text:"🚫 Link interdit"});
      }
    }

  });
}

startBot();
