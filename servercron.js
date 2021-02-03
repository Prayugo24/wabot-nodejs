var express    = require('express');
var request = require('request');
const find = require('find-process');
const exec = require('child_process').exec;
const fs = require('fs');
const modules = require('./module');
var moment = require('moment'); // require
var momentTz = require('moment-timezone'); // require
const mysql = require('mysql');
const ps = require('ps-node');
const e = require('express');
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

async function getSession(session){
    await con.query("select * from was where session='"+session+"'", function(err, result) {
        if (err) {
            console.log("Error Getsession"); 
            console.log(err);      
        }
        if(result){
            for (let i = 0; i < result.length; i++) {
                console.log(result[i].session);     
                let pid = result[i].pid;
                find('pid',pid)
                .then(function (list) {
                    if (!list.length) {
                        console.log('Module StartSession:', result[i].session);
                        modules.StartSession(result[i].session);        
                    } else {
                        if(list[0].name=="node.exe" || list[0].name=="node"){
                            console.log('Sudah Berjalan W:', list[0].name + ' PID : ' + pid);
                        }else{
                            console.log('Module StartSession:', result[i].session);
                            modules.StartSession(result[i].session);        
                        }
                    }
                })        
            }
        }
    });
}

async function runserv() { 
    await con.query("select * from was where status<=1", function(err, result) {
        if (err) {
            console.log(err);            
        }
        if(result.length > 0 ){
            for (let i = 0; i < result.length; i++) {
                var now = momentTz(new Date().now).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm')
                console.log('Asia/jakarta time: '+ now)
                let pid = result[i].pid;
                console.log(pid);
                find('pid',pid)
                .then(function (list) {
                    if (!list.length) {
                        console.log('Sudah Berjalan pr21 :', result[i].session);
                        // exec('node ./web.js '+ result[i].session);
                        getSession(result[i].session);
                    } else {
                      console.log('Sudah Berjalan pr2 :', list[0].name);
                        if(result[i].status == 0){
                            ps.kill(result[i].pid);
                            getSession(result[i].session);
                            // exec('node ./web.js '+ result[i].session);
                        }
                    }
                })        
            }
        }else{
            console.log("Query Empty"); 
        }
        
    });
}


async function KillSession() {
    await con.query("select * from was where status=2", function(err, result) {
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

setInterval(() => {
    KillSession();
    runserv();
}, 10000);