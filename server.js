var express    = require('express');
var request = require('request');
const find = require('find-process');
const exec = require('child_process').exec;
const fs = require('fs');
const mysql = require('mysql');
const ps = require('ps-node');
require('dotenv').config();
const web_port = 7000;
var con = mysql.createConnection({
    host: process.env.mysql_host,
    user: process.env.mysql_user,
    password: process.env.mysql_password,
    database: process.env.mysql_db,
    port : process.env.mysql_port,
    charset : process.env.charset
  });
con.connect(function(err) {
    if (err) console.log(err);  
});

con.query("select * from botsettings limit 0,1",function(err,rows){
    if(err){
        console.log(err)        
    }else{
        if(rows.length > 0){
            let pid = rows[0].pid;
            find('pid',pid).then(function(res) {
                // console.log(res);
                if(res.length>0){
                    console.log("Service already running at PID : " + pid);
                    process.exit();                    
                }else{
                    console.log("Service Start at PID : "+ process.pid);
                    con.query("update botsettings set pid="+ process.pid);
                }
            })
        }
    }
});


async function runserv() { 
    con.query("select * from was where status<=1", function(err, result) {
        if (err) {
            console.log(err);            
        }   
        // console.log(result);          
        for (let i = 0; i < result.length; i++) {
            
            let pid = result[i].pid;
            find('pid',pid)
            .then(function (list) {
                if (!list.length) {
                    console.log('Sudah Berjalan A :', result[i].session);
                    exec('node ./web.js '+ result[i].session);
                } else {
                  console.log('Sudah Berjalan m :', list[0].name);
                    if(result[i].status == 0){
                        ps.kill(result[i].pid);
                        exec('node ./web.js '+ result[i].session);
                    }
                }
            })        
        }
    });
}

async function KillSession() {
    con.query("select * from was where status=2", function(err, result) {
        if (err) {
            console.log(err);            
        }          
        for (let i = 0; i < result.length; i++) {
            console.log(result[i].session);     
            let pid = result[i].pid;
            find('pid',pid)
            .then(function (list) {
                if (list.length>0) {
                    ps.kill(result[i].pid);
                    con.query("update was set pid=null,state=null,battery=null,pushname=null,connected=0,contact=null,barcode=null where id="+ result[i].id);
                } 
            })        
        }
    });
}

con.query("update was set status=0,server=null,battery=0,name=null,connected=0,barcode=null where status<=1");
setInterval(() => {
    KillSession();
    runserv();
}, 10000);

// get reques dari http
// var app = express();
// app.all('/', function(req, res){
//     // console.log(req);
//     let target = req.query.target;
//     let pesan = req.query.pesan;
//     res.send(" Pesan segera dikirim ke " + target);
//     if(target!= undefined && pesan != undefined){
//         con.query("insert into chats(chatid,message)values('"+target+"','"+pesan+"')",function(err,data){
//             if(err)
//                 console.log(err);
//         });
//     }
// });

// // sever get
// app.listen(web_port, function () {
//     console.log('listening on : http://localhost:' + web_port);
// });