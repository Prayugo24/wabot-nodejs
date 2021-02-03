var express = require('express')
const env = require("dotenv")
const app = express()
const bodyParser = require('body-parser')

env.config()
const RunningPort = process.env.RUNNING_PORT

// midleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false})) //biar bsa di injek

// Routes
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
const routes = require('./routes/routes')
app.use('/',routes)
app.get('/', (req, res) => res.send('Welcome Wa Nodejs V2'))

app.use((req, res, next)=>{
    const err = new Error("Not Found");
    err.status = 404
    next(err);
})

// error handller function
app.use((err, req, res, next) =>{
    const error = app.get('env') === 'development' ? err : {};
    const status = err.status || 500;
    // response to client
    res.status(status).json({
        error:{
            message: error.message
        }
    })
    // response to ourselves
    console.error(err);
})

const port = app.get('port') || RunningPort;
app.listen(port, () => console.log('Server is listening on port '+port ));