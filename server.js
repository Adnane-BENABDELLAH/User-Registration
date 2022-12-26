const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const User = require('./model/user')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
let ejs = require('ejs')

// We normally should use jwt.verify() for authorization, but I couldn't, So I thought we can use this
// variable to block access to the list of users for those who aren't logged in
let IS_CONNECTED = false

const JWT_SECRET = 'saidimneverlackinalwayspistolpackinwiththemautomaticswegonsendhimtoheaven'

mongoose.connect('mongodb://localhost:27017/registeration', {
    useNewUrlParser: true, //get ride of warnings
    useUnifiedTopology: true, //get ride of warnings
})

const db = mongoose.connection

const app = express()
app.use('/', express.static(path.join(__dirname, 'views/static')))

// Middleware for express to decode the body which is coming in
app.use(bodyParser.json())
app.use(express.json())

// Authentication middleware
// function authenticateToken(req, res, next) {
//     const authHeader = req.headers['authorization']
//     const token = authHeader && authHeader.split(' ')[1]
//     if (token == null) {
//         return res.json({ status: 'error', error: 'No token found' })
//     }
//     jwt.verify(token, JWT_SECRET, (err, user) => {
//         if (err) {
//             return res.json({ status: 'error', error: 'Invalid token' })
//         }
//         req.user = user
//         next()
//     })
// }

// I wanted to use this middleware in the get list of users function, but it didn't work, so I decided 
// to use IS_CONNECTED variable

// set the view engine to ejs
app.set('view engine', 'ejs')

// list of users
app.get('/users', (req, res) => {
    if(IS_CONNECTED){
        User.find()
        .then(data => {
            // res.render to load up the ejs view file
            res.render('pages/listOfUsers', {
                users: data
            });
        })
        .catch(error => {
            res.json({
                message: 'Something went wrong!'
            })
        })
    }
    else {
        res.redirect('/login.html')
    }

})

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body
    const user = await User.findOne({ email }).lean()

    if(!user){ //We check if the object user is null (User with the email typed not found)
        IS_CONNECTED = false
        return res.json({ status: 'error', error: 'Invalid email or password' })
    }
    // If the user is not null, means the email is correct. We now need to compare the password
    // To do that we use the bcrypt method that compares the password entered through the login form
    // and the password store in our DB
    if(await bcrypt.compare(password, user.password)){
        IS_CONNECTED = true
        // We create the token using user info + the secret key that we created earlier
        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET)
        return res.json({ status: 'ok', data: token })
    }

    res.json({ status: 'error', error: 'Invalid email or password' })
})

app.post('/api/register', async (req, res) => {
    const { email, password: plainTextPassword } = req.body
    const password = await bcrypt.hash(plainTextPassword, 5)
    try {
        const response = await User.create({
            email,
            password
        })
        IS_CONNECTED = true
    } catch (error) {
        IS_CONNECTED = false
        return res.json({ status: error })
    }
    
    res.json({ status: 'ok'})
})

app.listen(3000, () => {
    console.log('Server is running on port 3000');
})

