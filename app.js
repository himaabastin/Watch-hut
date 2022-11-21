const express=require('express')
const app=express()
const path=require('path')
const hbs=require('express-handlebars')
const cookieParser=require('cookie-parser')
const logger=require('morgan')
const userRouter=require('./routes/user')
const adminRouter=require('./routes/admin')
const fileUpload=require("express-fileupload")
const db=require('./config/connection')
const session=require('express-session')
const {check,validationResult}=require('express-validator')
const noCache=require('nocache')



//to set view engine
app.set('views',path.join(__dirname, 'views'))
app.set('view engine','hbs')
app.engine('hbs',
hbs.engine({
    extname:'hbs',
    defaultLayout:'layout',
    layoutsDir:__dirname+"/views/layout/",
    partialsDir:__dirname+ "/views/partials/",
    helpers :{
        inc:function(value,options){
            return parseInt(value) +1
        },
    },
})
)
app.use(noCache())
app.use(logger('dev'))

app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname,'public')))
app.use(fileUpload())
app.use(session({
    secret:"Key",
    resave:false,
    saveUninitialized:false,
    cookie:
    {maxAge:300000}}))
   

db.connect((err)=>{
    if(err){
        console.log('connection error'+err)
    }
    else{
        console.log('database connected')

    }
})
app.use('/',userRouter)
app.use('/admin',adminRouter)
 


app.get('/',(req,res)=>{
    res.render('index')
})


app.listen(3000,()=>{
    console.log('server started')
})

