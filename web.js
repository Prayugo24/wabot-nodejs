const app = require('./module');
const find = require('find-process');
const mysql = require('mysql');
var express    = require('express');
require('dotenv').config();
let web_port = 8080;
var con = mysql.createConnection({
    host: process.env.mysql_host,
    user: process.env.mysql_user,
    password: process.env.mysql_password,
    database: process.env.mysql_db,
    port : process.env.mysql_port,
    charset : process.env.charset
});

con.connect(function(err) {
    if (err) throw err;  
});
let sess = process.argv[2];
if(sess==null || sess==''){
    console.log("error");
    process.exit();
}

con.query("select * from was where session='"+sess+"'", function(err, result) {
    if (err) {
        console.log(err);      
    }
    if(result){
        console.log('StartSession:', result);
        for (let i = 0; i < result.length; i++) {
            console.log(result[i].session);     
            let pid = result[i].pid;
            find('pid',pid)
            .then(function (list) {
                if (!list.length) {
                    console.log('StartSession:', result[i].session);
                    app.StartSession(result[i].session);        
                } else {
                    if(list[0].name=="node.exe" || list[0].name=="node"){
                        console.log('Sudah Berjalan W:', list[0].name + ' PID : ' + pid);
                        
                    }else{
                        console.log('StartSession:', result[i].session);
                        app.StartSession(result[i].session);        
                    }
                }
            })        
        }
    }
});
