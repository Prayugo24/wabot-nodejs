const apps = require('venom-bot');
const fs = require('fs');
const mime = require('mime-types');
var mysql = require('mysql');
const { measureMemory } = require('vm');
const axios = require('axios');
const qs = require('querystring');
var moment = require('moment'); // require
var momentTz = require('moment-timezone'); // require
const request = require('request');
require('dotenv').config();
var userid = 0;
var was_id = "0";
var server_id = "";
var IntSend = 1000;
var sesname = "";
var ip_public = "127.0.0.1";
var port = process.env.port_ip_image;
let webhook_url = 'https://api.ditoko.com/api/v1/wablas/callback';
// let webhook_url = 'http://[::1]:8000/api/v1/wablas/callback';
path_upload = process.env.path_upload || './';
var con = require('../config/database');
con.connect(function(err) {
    if (err) throw err;  
});

const publicIp = require("public-ip");
publicIp.v4().then(ip => {
  console.log("your public ip address", ip);
  ip_public = ip+":"+port;
  console.log("ip port :"+ip_public);
});

module.exports = {
    StartSession:async(session)=>{
        sesname = session;
        console.log("cek session :"+sesname);
        con.query("update was set pid='" + process.pid + "',status=1,updated_at=now() where session='"+sesname+"'");
        apps.create(
            session,
            (base64Qrimg, asciiQR) => {
              con.query("select * from was where session='"+session+"'", function(err, result) {
                if (err) {
                  console.log(err);            
                }
                if(result.length > 0 ){
                  for (let i = 0; i < result.length; i++) {
                      var html  = `
                      <h2 class="text-center">Barcode Whatsapp</h2>
                      <img src="${base64Qrimg}">
                      <script language="javascript">
                      setInterval(function(){
                        window.location.reload(1);
                      }, 5000);
                      </script>`
                    fs.writeFileSync('./media/'+result[i].session+'.html', html);
                    console.log('writete to'+'./media/'+result[i].session+'.html');
                  }
                }
              });
              con.query("update was set barcode='"+ base64Qrimg + "',name=null,server=null,battery=null,phone=null,connected=null,state=null where session='"+session+"'");    
            },
            (statusSession) => {
              // console.log('Status Session: ', statusSession); //return isLogged || notLogged || browserClose || qrReadSuccess || qrReadFail || autocloseCalled  
              con.query("update was set status_session='"+ statusSession + "' where session='"+session+"'");
              if(statusSession=='browserClose'){
                process.exit();
              }
            },
            {
              folderNameToken: "tokens", //folder name when saving tokens
              // mkdirFolderToken: '', //folder directory tokens, just inside the venom folder, example:  { mkdirFolderToken: '/node_modules', } //will save the tokens folder in the node_modules directory
              // headless: true, // Headless chrome
              // devtools: false, // Open devtools by default
              // useChrome: false, // If false will use Chromium instance
              // debug: false, // Opens a debug session
              // logQR: false, // Logs QR automatically in terminal
              // browserArgs: ['--no-sandbox'], // Parameters to be added into the chrome browser instance
              // disableSpins: true, // Will disable Spinnies animation, useful for containers (docker) for a better log
              // disableWelcome: true, // Will disable the welcoming message which appears in the beginning
              // updates: false, // Logs info updates automatically in terminal
              // autoClose: 60, // Automatically closes the venom-bot only when scanning the QR code (default 60 seconds, if you want to turn it off, assign 0 or false)
              headless: true, // Headless chrome
              devtools: false, // Open devtools by default
              useChrome: true, // If false will use Chromium instance
              debug: false, // Opens a debug session
              logQR: true, // Logs QR automatically in terminal
              browserWS: '', // If u want to use browserWSEndpoint
              browserArgs: ['--no-sandbox'], // Parameters to be added into the chrome browser instance
              puppeteerOptions: {}, // Will be passed to puppeteer.launch
              disableSpins: true, // Will disable Spinnies animation, useful for containers (docker) for a better log
              disableWelcome: true, // Will disable the welcoming message which appears in the beginning
              updatesLog: true, // Logs info updates automatically in terminal
              autoClose: 0, // Automatically closes the venom-bot only when scanning the QR code (default 60 seconds, if you want to turn it off, assign 0 or false)
              createPathFileToken: true, 
            }
          )
          .then((client) => {
            console.log("DataClinet");
            
            console.log(client);
            OnLogin(client,session);
            ChangeState(client);
            Inbox(client,session);
            SendMessage(client,session);
            OnRead(client,session);
            ReadUnread(client,session);
          })
          .catch((erro) => {
            console.log(erro);
          });
    }
    
}



// OnMessage / Inboxs
function Inbox(client,session) {
    client.onMessage(async(message) => {      
      fs.writeFile('./logs/message_'+message.type+'.json',JSON.stringify(message),'utf8',function(err){
         if(err) console.log(err);
      });
      var date = new Date(message.t * 1000);
      var dateStr = new Date(message.t * 1000).toLocaleDateString(undefined, {
        day:   '2-digit',
        month: '2-digit',
        year:  'numeric',
      });
      dateStr = dateStr.replace("/","-")
      dateStr = dateStr.replace("/","-")
      var hours = date.getHours("en-US", {timeZone: "Asia/Jakarta"});
      var minutes = "0" + date.getMinutes("en-US", {timeZone: "Asia/Jakarta"});
      var seconds = "0" + date.getSeconds("en-US", {timeZone: "Asia/Jakarta"});
      var formattedTime = dateStr+' '+hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
      var LogsMesage = '['+formattedTime+' | '+message.from.replace("@c.us"," ")+'] => '+message.body +' <br>'
      
      fs.appendFile('./logs/storage/message_receive_'+session+'.txt', LogsMesage+ "\r\n" , function (err) {
        if (err) throw err;
        console.log("Message : ",message.body);
      });
      // process.exit();
      fs.appendFile('logchats.txt', message.from + "=>" + message.body + "\r\n", function (err) {
        if (err) throw err;
        console.log("Message : ",message.body);
      });


      
      var fileName;
      var mgsid = message.chat.lastReceivedKey.id;
      if (message.isMedia === true || message.isMMS === true) {
        const buffer = await client.decryptFile(message);
        fileName = session+"_"+message.t +`.${mime.extension(message.mimetype)}`;
        await fs.writeFile(process.env.save_media + "/" + fileName, buffer, (err) => {
          if(err) console.log(err);
          console.log("receive file");
          fileName = session+"_"+message.t +`.${mime.extension(message.mimetype)}`;
          SendCallback(message,fileName);
        });
      }else{
        SendCallback(message);
        console.log("inbox");
        // console.log(message);
      }
      await client.sendSeen(message.from);
      // Insert Msg to DB
      if(message.type==="chat"){
        console.log(message.type);
        con.query("insert into chats(session,chatid,msgid,`from`,`to`,message,type,messageid,chat_type,created_at)values('"+session+"','"+message.from+"','"+mgsid+"','"+message.from+"','"+message.to+"','"+addslashes(message.body)+"','"+message.type+"','"+message.id+"','IN',NOW())");
      }else if(message.type==="image" || message.type==="document"){
        console.log(message.type);
        con.query("insert into chats(session,chatid,msgid,`from`,`to`,message,type,msgbase64,messageid,chat_type,created_at,file_name)values('"+session+"','"+message.from+"','"+mgsid+"','"+message.from+"','"+message.to+"','"+addslashes(message.caption)+"','"+message.type+"','"+addslashes(message.body)+"','"+message.id+"','IN',NOW(),'"+fileName+"')");
      }else if(message.type==="location"){
        console.log(message.type);
        con.query("insert into chats(session,chatid,msgid,`from`,`to`,message,type,messageid,chat_type,lat,lng,created_at)values('"+session+"','"+message.from+"','"+message.from+"','"+mgsid+"','"+message.to+"','"+message.location+"','"+message.type+"','"+message.id+"','IN','"+message.lat+"','"+message.lng+"',NOW())");
      }else if(message.type==="vcard"){
        console.log(message.type);
        con.query("insert into chats(session,chatid,msgid,`from`,`to`,message,type,messageid,chat_type,vcard,vcard_name,created_at)values('"+session+"','"+message.from+"','"+mgsid+"','"+message.from+"','"+message.to+"','"+message.vcardFormattedName+"','"+message.type+"','"+message.id+"','IN','"+message.content+"','"+message.vcardFormattedName+"',NOW())");
      }else{
        console.log(message.type);
        con.query("insert into chats(session,chatid,msgid,`from`,`to`,message,type,messageid,chat_type,created_at)values('"+session+"','"+message.from+"','"+message.from+"','"+mgsid+"','"+message.to+"','"+message.body+"','"+message.type+"','"+message.id+"','IN',NOW())");
      }
      
    });
  }


  // send message
  function SendMessage(client,session) {
    setInterval(() => {
      con.query("select * from chats where chat_type='out' and processed=0 and sent_at<=date_add(now(),INTERVAL 0 HOUR) and session='"+session+"' limit 0,1",function(err,res){
        if(err){
          console.log(err);          
        }
        if (res) {
          
          for (let i = 0; i < res.length; i++) {
            const item = res[i];
            console.log(item);
            var target = "";
            var result;
            let type = item.type;
            // Group | User
            if(item.is_group==="0"){
              target = item.chatid.replace(/^0/,'62');
              target = (target.indexOf('@c.us')>1)?target:target+'@c.us';
            }else{
              target = item.chatid;
            }            
            // Kirim text
            
            if(type==="chat"){
                con.query("update chats set processed=1 where id="+item.id); 
                console.log(item.is_reply);                 
                if(item.is_reply=="Y"){
                  con.query("select * from chats where msgid='"+item.reply+"' limit 0,1",function(err,rw){
                    if(err) console.log(err);
                    if(rw){
                      console.log('=>'+rw[0].messageid.toString());
                      client.reply(target,item.message,rw[0].messageid.toString());
                    }
                  });  
                }else{
                  client.sendText(target, item.message)
                    .then((result)=>{
                      var formattedTime = momentTz(new Date().now).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm')
                      var LogsMesage = '['+formattedTime+' | '+result.from.replace("@c.us"," ")+'] => '+result.body +' <br>'
                      result = result;    
                      fs.writeFile('./logs/sent_'+type+'.json',JSON.stringify(result),'utf8',function(err){
                        if(err) console.log(err);
                      });
                      fs.appendFile('./logs/storage/message_send_'+session+'.txt', LogsMesage+ "\r\n" , function (err) {
                        if (err) throw err;
                        console.log("Message : ",result.body);
                      });                              
                    }).catch((erro)=>{
                      console.error("Error when sending: ", erro); //return object error
                  });
                }
                
            // Location
            }else if(type==="location"){
              client.sendLocation(target, item.lat, item.lng, item.message).then((result)=>{
                result = result;
                con.query("update chats set processed=1 where id="+item.id);                  
                }).catch((erro)=>{
                    console.error("Error when sending: ", erro); //return object error
              });
            }else if(type==="image"){
              con.query("update chats set processed=1 where id="+item.id); 
              client.sendImage(target, path_upload + '/'+ item.file_name,item.file_name, item.message).then((result)=>{
                result = result;                                 
                }).catch((erro)=>{
                    console.error("Error when sending: ", erro); //return object error
              });
            }else{
              con.query("update chats set processed=1 where id="+item.id);    
              client.sendFile(target, path_upload + '/' + item.file_name,item.file_name, item.message).then((result)=>{
                result = result;                              
                }).catch((erro)=>{
                    console.error("Error when sending: ", erro); //return object error
              });
            }

            
          }
        }
      });
    }, IntSend);
  }
// OnAck | OnRead Message
function OnRead(client,session) {    
    var countRead = 0;
    client.onAck(ack => {
      let messageid = ack.id._serialized;
      let msgid = ack.id.id;
      let message = ack.body;
      let ackno = ack.ack;
      let chatid = ack.to;
      var formattedTime = momentTz(new Date().now).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm')
      if(countRead < 1){
        var LogsMesage = '['+formattedTime+' | '+ack.from.replace("@c.us"," ")+'] => '+ack.body +' <br>'
        fs.appendFile('./logs/storage/message_send_'+session+'.txt', LogsMesage+ "\r\n" , function (err) {
          if (err) throw err;
          console.log("Message : ",message.body);
        });
      }
      
      con.query("update chats set ack='"+ackno+"',messageid='"+messageid+"',msgid='"+msgid+"' where chatid='"+chatid+"' and message='"+addslashes(message)+"'");
      fs.writeFile('./logs/ack_sent_'+ack.type+'.json',JSON.stringify(ack),'utf8',function(err){
        if(err) console.log(err);
      });
      countRead++;
    });
}

// Update Status
function OnLogin(client,session) {
  setInterval(() => {
    client.getHostDevice().then(async(data)=>{        
        fs.writeFile('./logs/HostDevice_'+session+'.json',JSON.stringify(data),'utf8',function(err){
            if(err)
            console.log("Error OnLogin");
            console.log(err);
        });
        if(data){
          try {
            console.log("Cek Login");
            console.log(data);
            con.query("update was set battery='"+data.battery+"',name='"+data.pushname+"',server='"+data.wid.user+"',phone='"+data.phone.device_model+"',connected=1,barcode=null where session='"+session+"'");
          }catch(err) {
            console.log('User Disconect');
            fs.unlink('./logs/HostDevice_'+session+'.json', (err,result) => {
              if (err) {
                console.error(err)
                return
              }
              if(result){
                  console.log('Delete HostDevice_'+session);   
                  client.getSessionTokenBrowser(True);
                  // client.killServiceWorker();
              }
          })
          }
        }
    });
  }, 5000);  
}

// Update State
function ChangeState(client) {
    client.onStateChange((state) => {
        console.log(state);     
        
        const conflits = [
          apps.SocketState.CONFLICT,
          apps.SocketState.UNPAIRED,
          apps.SocketState.UNLAUNCHED,
        ];
        console.log('ChangeState'); 
        console.log(conflits); 
        if (conflits.includes(state)) {
          client.useHere();
        }
      });
}


function ReplaceEmo(str) {
  return str.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, ':)');
}

function addslashes(string) {
  return string.replace(/\\/g, '\\\\').
      replace(/\u0008/g, '\\b').
      replace(/\t/g, '\\t').
      replace(/\n/g, '\\n').
      replace(/\f/g, '\\f').
      replace(/\r/g, '\\r').
      replace(/'/g, '\\\'').
      replace(/"/g, '\\"');
}

function SendCallback(message,url='') {
      let msgid = message.chat.lastReceivedKey.id || message.id.id || '';
      let msg = message.caption || message.body ;
      // let msg = message.caption || 'image' ;
      console.log(msg)
      console.log("SendCallback");
      msg = msg !== undefined || msg !== '' ? msg :'images'
      // console.log("Test :"+msg)
      let phone = message.from.replace('@c.us','');
      let to = message.to.replace('@c.us','');
      console.log(message)

      const data = {
        id: msgid,
        message: msg,
        phone : phone,
        from : to,
        url : (url) ? "http://"+ip_public+"/whatsapp_media/" + url : ''
      }
      var ipUrl = (url) ? "http://"+ip_public+"/whatsapp_media/" + url : ''
      console.log("WEBHOOK =====================");
      console.log(webhook_url);
      console.log(data);

    var options = {
      'method': 'POST',
      'url': webhook_url,
      'headers': {
        'Accept': 'application/json',
      },
      formData: data
    };
    request(options, function (error, response) {
      if (error) throw new Error(error);
      console.log(response.body);
    });
    
} 

async function ReadUnread(client,session) {
  const AllMsg = await client.getAllUnreadMessages();
  for (let i = 0; i < AllMsg.length; i++) {
      const message = AllMsg[i];
      // console.log(message);
      var fileName;
      var mgsid = message.id.id;  
      let phone = message.from.replace('@c.us','');    
      let to = message.to.replace('@c.us','');    
      if (message.isMedia === true || message.isMMS === true) {
        const buffer = await client.decryptFile(message);
        fileName = session+"_"+message.t +`.${mime.extension(message.mimetype)}`;
        await fs.writeFile(process.env.save_media + "/" + fileName, buffer, (err) => {
          if(err) console.log(err);
          console.log("receive file");
          fileName = session+"_"+message.t +`.${mime.extension(message.mimetype)}`;  
          const data = {
            id: mgsid,
            message: message.caption || '',
            phone : phone,
            from : to,
            url : (fileName) ? "http://"+ip_public+"/whatsapp_media/" + fileName : ''
          }      
          console.log('ReadUnread 1');
          console.log(data);
          var options = {
            'method': 'POST',
            'url': webhook_url,
            'headers': {
              'Accept': 'application/json',
            },
            formData: data
          };
          request(options, function (error, response) {
            if (error) throw new Error(error);
            console.log(response.body);
          });      
        });
      }else{
        const data = {
          id: mgsid,
          message: message.body,
          phone : phone,
          from : to,
          url : (fileName) ? "http://"+ip_public+"/whatsapp_media/" + fileName : ''
        }      
        console.log('ReadUnread 2');
        console.log(data)
        var options = {
          'method': 'POST',
          'url': webhook_url,
          'headers': {
            'Accept': 'application/json',
          },
          formData: data
        };
        request(options, function (error, response) {
          if (error) throw new Error(error);
          console.log(response.body);
        });
        // request.post(webhook_url, {
        //   form: data
        // },function (err, httpResponse, body){
        //     console.log("Response :", body);
        //     console.log("Session :", session);
        //     console.log("Data :", JSON.stringify(data));
        //     // console.log("resp", httpResponse);
        // });
      }
      await client.sendSeen(message.from);
      
  }
}