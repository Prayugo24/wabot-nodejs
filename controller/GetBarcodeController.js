const Modul = require('../module')
var path = require('path');
var url = require('url');
var io = require('socket.io');
const media = './media/';
const fs = require('fs');
var request = require('request');
var con = require('../config/database');
const axios = require('axios')
var multer  = require('multer')
var upload = multer().single('image_url')
const sharp = require("sharp");
const env = require("dotenv")
const fetch = require('node-fetch');
const http = require('http'); 
env.config()
var pathImage = process.env.path_upload
 

module.exports = {
    ListBarcode : async function(req, res, next){
        try {
            var itemsProcessed = 0;
            var ListBarcode = []
            await fs.readdir(media, (err, files) => {
                if(err) console.log('error');
                if(files.length > 0){
                    files.forEach(async (file) => {
                        // console.log(file);
                        var session = file.replace(".html","")
                        await con.query("select * from was where session='"+session+"'", function(err,result){
                                if(err) console.log(err);
                                if(result){
                                    // console.log('');
                                    result.forEach(async (resp) => {
                                        // console.log(resp.pid);
                                        ListBarcode.push({
                                            nameSession : resp.session,
                                            noHp : resp.server,
                                            status : resp.status_session,
                                            file_scan : file,
                                        });    
                                        itemsProcessed++;
                                        if(itemsProcessed === files.length) {
                                            module.exports.ViewListBarcode(ListBarcode,res);
                                        }
                                    })   
                                }
                        });
                        
                    })
                }else{
                    console.log('Barcode Empty');
                    module.exports.ViewListBarcode(ListBarcode,res);
                }
                
              });
        }catch(err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    },
    ViewListBarcode : async function(ListBarcode,res){
        try {
            console.log("Proses GetBarcode")
            console.log(ListBarcode);
            res.render('list-barcode', { title: 'List Barcode', userData: ListBarcode});
        }catch(err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    },
    GetBarcode : async function(req, res, next){
        try {
            var urlParts = url.parse(req.url, true);
            var queryBarcode = urlParts.query;
            var barcodeName = queryBarcode.barcode;
            // console.log("barcode name :"+barcodeName);
            res.sendFile(path.resolve('./media/'+barcodeName));
        }catch(err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    },
    ViewAddSession:  async function(req, res, next){
        try {
            var urlParts = url.parse(req.url, true);
            var querySession = urlParts.query;
            var session = querySession.session;
            res.render("add-session");
        }catch(err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    },
    saveDatachat: async function(req, res, next){
        try { 
            upload(req, res, async function (err) {
                var results = []
                var phone = req.body.phone !== undefined && req.body.phone !== null ? req.body.phone: ''
                // var from = req.body.from !== undefined ? req.body.from+'@c.us': ''
                // var to = req.body.to !== undefined && req.body.to !== null ? req.body.to+'@c.us': ''
                phone = phone.charAt(0) == 0 ? '62'+phone.substring(1)+'@c.us': phone+'@c.us';
                
                // from  = from.replace('0', '62')+'@c.us';
                // phone = '62'+phone.substring(1)+'@c.us'
                // from = '62'+from.substring(1)+'@c.us'
                // to = '62'+to.substring(1)+'@c.us'
                
                // from = '62'+from.substring(from.indexOf('0') + 1)+'@c.us';
                // to = '62'+to.substring(to.indexOf('0') + 1)+'@c.us';
                // console.log(phone);
                // process.exit()
                var message = req.body.message !== undefined ? req.body.message :''
                var session = req.body.session !== undefined ? req.body.session :''
                if(session == ''){
                    var urlParts = url.parse(req.url, true);
                    var querySession = urlParts.query;
                    session = querySession.session;
                    session = session !== '' && session !== undefined ? session : 'system'
                }
                
                var caption = req.body.caption !== undefined ? req.body.caption :''
                var reply = req.body.reply !== undefined ? req.body.reply : ''
                var is_reply = req.body.reply !== undefined ? 'Y' : 'N'
                var image_url = req.body.image_url !== undefined ? req.body.image_url : ''
                var imageName = ''
                var type = 'chat'
                var captions = image_url !== '' ? caption : message
                console.log('caption :'+captions);
                if(image_url !== ''){
                    type = 'image'
                    imageName = image_url.substring(image_url.lastIndexOf('/') + 1);
                    var response = await fetch(image_url);
                    var buffer = await response.buffer();
                    fs.writeFile(pathImage+'/'+imageName, buffer, () => 
                        console.log('finished downloading!'));
                }
                // process.exit()
                // if (file) {
                //     type = 'image'
                //     captions = caption
                //     imageName = req.file.originalname
                //     await sharp(file.buffer)
                //     .toFile(pathImage+'/'+imageName);
                //     console.log(imageName); 
                //     console.log("Save Image"); 
                // }
                con.query("select * from was where session='"+session+"'", function(err,result){
                    if(err){
                        console.log(err);
                        results = {
                            data:{
                                message: err.toString()
                            }
                        }
                        res.json(results)
                    } 
                    if(result){
                        result.forEach(async (resp) => {
                            from = resp.server+'@c.us'
                            con.query("insert into chats(type,chatid,message,chat_type,file_name,is_reply,reply,session,`to`,`from`)values('"+type+"','"+phone+"','"+captions+"','OUT','"+imageName+"','"+is_reply+"','"+reply+"','"+session+"','"+phone+"','"+from+"')",function(err,result){
                                if(err) console.log(err);
                                if(result){
                                    console.log("Save Chats"); 
                                    console.log(result);
                                    results = {
                                        data:{
                                            phone:phone,
                                            from:resp.server,
                                            to:phone,
                                            message:message,
                                            image_url:imageName,
                                            caption:caption
                                        }
                                    }
                                    res.json(results)
                                }
                            });
                        })   
                    }
                });
                
              })
        }catch(err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    },
    AddSession:  async function(req, res, next){
        try {
            var urlParts = url.parse(req.url, true);
            var querySession = urlParts.query;
            var session = querySession.session;
            await con.query("insert into was(session,userid,status,barcode,server,name)values('"+session+"','"+0+"','"+0+"','','','')",function(err,result){
                if(err) console.log(err);
                if(result){
                    console.log(result);
                    res.json(result)
                }
            });
        }catch(err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    },
    LogsIncoming:  async function(req, res, next){
        try {
            var urlParts = url.parse(req.url, true);
            var queryLogs = urlParts.query;
            var LogsIncoming = queryLogs.Logs;
            console.log(LogsIncoming);
            fs.readFile('./logs/storage/message_receive_'+LogsIncoming+'.txt',"utf8",(error,data)=>{
                console.log(data);
                var logsData = [];
                try {
                    var DataMessage = data.toString().split("<br>");
                    var number = DataMessage.length-1
                    for(i in DataMessage) {
                        var message = DataMessage[number-i];
                        // message = message.toString().replace(","," ")
                        // console.log(message);
                        // console.log(number-i);
                        logsData.push(message);
                    }
                }catch(err) {
                    console.log(data);
                }
                // console.log(logsData);
                res.render("logs-incoming",{dataLogs:logsData});
            });
        }catch(err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    },
    LogsOutgoing:  async function(req, res, next){
        try {
            var urlParts = url.parse(req.url, true);
            var queryLogs = urlParts.query;
            var LogsOutcoming = queryLogs.Logs;
            fs.readFile('./logs/storage/message_send_'+LogsOutcoming+'.txt',"utf8",(error,data)=>{
                var logsData = [];
                try {
                    var DataMessage = data.toString().split("<br>");
                    var number = DataMessage.length-1
                    //Add your error handling (if(error))
                    for(i in DataMessage) {
                        var message = DataMessage[number-i];
                        // message = message.toString().replace(","," ")
                        // console.log(message);
                        // console.log(number-i);
                        logsData.push(message);
                    }
                }catch(err) {
                    console.log(data);
                }
                res.render("logs-outgoing",{dataLogs:logsData});
            });
        }catch(err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    },
    DeleteBarcode:  async function(req, res, next){
        try {
            var urlParts = url.parse(req.url, true);
            var querySession = urlParts.query;
            var session = querySession.session;
            console.log('Hello');
            fs.unlink('./media/'+session+'.html', (err,result) => {
                if (err) {
                  console.error(err)
                  return
                }
                if(result){
                    console.log('Delete Succes media');   
                }
            })
            fs.unlink('./tokens/'+session+'.data.json', (err,result) => {
                if (err) {
                  console.error(err)
                  return
                }
                if(result){
                    console.log('Delete Succes tokens');   
                }
            })
            fs.unlink('./logs/HostDevice_'+session+'.json', (err,result) => {
                if (err) {
                  console.error(err)
                  return
                }
                if(result){
                    console.log('Delete Succes Hostdevice');   
                }
            })
            con.query("select * from was where session='"+session+"'", function(err,result){
                if(err) {
                    console.log(err); 
                    return
                }
                if(result){
                    for (let i = 0; i < result.length; i++) {
                        console.log(result[i].session);     
                        var id_session = result[i].id
                        con.query("DELETE FROM was WHERE id="+id_session );
                        
                    }
                    
                    return res.json(result)
                }
              });  
        }catch(err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    },
    DeleteLogs:  async function(req, res, next){
        try {
            var urlParts = url.parse(req.url, true);
            var querySession = urlParts.query;
            var session = querySession.session;
            var respon = []
            fs.unlink('./logs/storage/'+session+'.txt', (err,result) => {
                if (err) {
                  console.error(err)
                  return respon
                }
                if(result){
                    console.log('Delete Succes');   
                }
            })
            respon = {
                response:{
                    message:"succes"
                }
            }
            console.log(respon);
            return res.json(respon)
            
        }catch(err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    },
    deleteMessageDelay:  async function(req, res, next){
        try {
            var urlParts = url.parse(req.url, true);
            var querySession = urlParts.query;
            var session = querySession.session;
            var respon = []
            var lengQuery = 0;
            con.query("select * from chats where chat_type='out' and processed=0 and STR_TO_DATE(`sent_at`, '%Y-%m-%d') = CURDATE() and session='"+session+"'", function(err,result){
                if(err) {
                    console.log(err);
                    return res.json(respon)
                }
                if(result){
                    for (let i = 0; i < result.length; i++) {
                        console.log(result[i].session);     
                        var id_chat = result[i].id
                        con.query("DELETE FROM chats where id="+id_chat );
                        console.log('Delete chats_id: '+id_chat);
                        lengQuery++;
                    }
                    if(lengQuery == result.length){
                        respon = {
                            response:{
                                message:"Delete Succes"
                            }
                        }
                        console.log(respon);
                        return res.json(respon)
                    }
                }
              });  
              
            
        }catch(err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    }
    

}