const env = require("dotenv")
var mysql = require('mysql');
env.config()

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

module.exports = con