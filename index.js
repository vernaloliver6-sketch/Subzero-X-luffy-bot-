
const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const express = require("express");

const app = express();
const PORT = 3000;

const owner = "18295238227@s.whatsapp.net";
let antiLink = true;
let premiumUsers = [];
let latestQR = ""; // ✅ STOCK QR

app.get("/", (req,res)=>{
  res.send(`
  <h2>🤖 BOT ONLINE - SUBZERO X LUFFY-BOT </h2>
  <a href="/qr">👉 Gade QR Code</a>
  `);
});

// ✅ ROUTE QR
app.get("/qr", (req,res)=>{
  if(!latestQR){
    return res.send("⌛ QR poko pare...");
  }

  res.send(`
    <h3>Scan QR la ak WhatsApp</h3>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${latestQR}" />
  `);
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
      latestQR = qr; // ✅ SAVE QR
      qrcode.generate(qr, {small:true});
      console.log("📱 Scan QR sou /qr");
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
        text:`👑 SUBZERO X LUFFY 👑

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

    if(text === ".ping"){
      sock.sendMessage(from,{text:"🏓 Pong"});
    }

    if(text === ".time"){
      sock.sendMessage(from,{text:new Date().toLocaleString()});
    }

    if(text.startsWith(".ai")){
      let q = text.replace(".ai","");
      sock.sendMessage(from,{
        text:"🤖 AI: Mwen konprann 👉 "+q
      });
    }

    if(text === ".addpremium"){
      if(sender !== owner) return;
      premiumUsers.push(from);
      sock.sendMessage(from,{text:"💎 Premium ajouté"});
    }

    if(text === ".removepremium"){
      if(sender !== owner) return;
      premiumUsers = premiumUsers.filter(u => u !== from);
      sock.sendMessage(from,{text:"❌ Retiré"});
    }

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
