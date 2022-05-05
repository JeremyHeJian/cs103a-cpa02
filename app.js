/*
  app.js -- This creates an Express webserver with login/register/logout authentication
*/

// *********************************************************** //
//  Loading packages to support the server
// *********************************************************** //
// First we load in all of the packages we need for the server...
const createError = require("http-errors"); // to handle the server errors
const express = require("express");
const path = require("path");  // to refer to local paths
const cookieParser = require("cookie-parser"); // to handle cookies
const session = require("express-session"); // to handle sessions using cookies
const debug = require("debug")("personalapp:server"); 
const layouts = require("express-ejs-layouts");
const axios = require("axios");

// *********************************************************** //
//  Loading models
// *********************************************************** //

const Saved = require('./models/Saved')
const Repo = require('./models/Repo');

// *********************************************************** //
//  Loading JSON datasets
// *********************************************************** //
const repos = require('./public/data/React-JS.json');


// *********************************************************** //
//  Connecting to the database
// *********************************************************** //

const mongoose = require( 'mongoose' );
const mongodb_URI =
  '';

mongoose.connect( mongodb_URI, { useNewUrlParser: true, useUnifiedTopology: true } );
// fix deprecation warnings
mongoose.set('useFindAndModify', false); 
mongoose.set('useCreateIndex', true);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {console.log("we are connected!!!")});





// *********************************************************** //
// Initializing the Express server 
// This code is run once when the app is started and it creates
// a server that respond to requests by sending responses
// *********************************************************** //
const app = express();

// Here we specify that we will be using EJS as our view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");



// this allows us to use page layout for the views 
// so we don't have to repeat the headers and footers on every page ...
// the layout is in views/layout.ejs
app.use(layouts);

// Here we process the requests so they are easy to handle
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Here we specify that static files will be in the public folder
app.use(express.static(path.join(__dirname, "public")));

// Here we enable session handling using cookies
app.use(
  session({
    secret: "zzbbyanana789sdfa8f9ds8f90ds87f8d9s789fds", // this ought to be hidden in process.env.SECRET
    resave: false,
    saveUninitialized: false
  })
);

// *********************************************************** //
//  Defining the routes the Express server will respond to
// *********************************************************** //


// here is the code which handles all /login /signin /logout routes
const auth = require('./routes/auth');
const { deflateSync } = require("zlib");
app.use(auth)

// middleware to test is the user is logged in, and if not, send them to the login page
const isLoggedIn = (req,res,next) => {
  if (res.locals.loggedIn) {
    next()
  }
  else res.redirect('/login')
}

// specify that the server should render the views/index.ejs page for the root path
// and the index.ejs code will be wrapped in the views/layouts.ejs code which provides
// the headers and footers for all webpages generated by this app
app.get("/", (req, res, next) => {
  res.render("index");
});

app.get("/about", (req, res, next) => {
  res.render("about");
});

app.get("/demo/:repo_name",
 async (req,res,next) => {
  try{
    const theRepos = await Repo.find({repo_name:req.params.repo_name})
    res.json(theRepos)
  } catch (e){
    next(e);
  }
})

app.get("/demo",
 async (req,res,next) => {
  try{
    const theRepos = await Repo.find({
      language: 'JavaScript',
      type: 'Organization',
      subscribers: {$gt: 1152},
    });
    res.json(theRepos)
  } catch (e){
    next(e);
  }
})

/* ************************
  Loading (or reloading) the data into a collection
   ************************ */
// this route loads in the repos into the Repo collection
// or updates the repos if it is not a new collection

app.get('/upsertDB',
  async (req,res,next) => {
    for (repo of repos){
      const {repo_name,username,language,type}=repo;
      await Repo.findOneAndUpdate({repo_name,username,language,type},repo,{upsert:true})
    }
    const num = await Repo.find({}).count();
    res.send("data uploaded: "+num)
  }
)


app.post('/repos/byRepoName',
  // show repo in a given repo name
  async (req,res,next) => {
    const {repo_name} = req.body;
    const repos = await Repo.find({repo_name:repo_name}).sort({stars:1,forks:1,subscribers:1})
    
    res.locals.repos = repos
    res.render('repolist')
  }
)

app.get('/repos/show/:repoId',
  // show all info about a repo given its repoid
  async (req,res,next) => {
    const {repoId} = req.params;
    const repo = await Repo.findOne({_id:repoId})
    res.locals.repo = repo
    res.render('repo')
  }
)
app.get(
  '/repos/byUsername/:username',
  // show a list of all repos created by a given user
  async (req, res, next) => {
    const username = req.params.username;
    const repos = await Repo.find({username: username});
    res.locals.repos = repos;
    res.render('repolist');
  }
);

app.post(
  '/repos/byLanguage',
  // show repos created by a language send from a form
  async (req, res, next) => {
    const language = req.body.language;
    const repos = await Repo.find({language: language}).sort({
      stars: -1,
      forks: -1,
      subscribers: -1,
    });
    res.locals.repos = repos;
    res.render('repolist');
  }
);
app.get('/repos/byUsername/:language',
  // show a list of all repos created by a given language
  async (req,res,next) => {
    const language = req.params.language;
    const repos = await Repo.find({language: language});
    res.locals.repos = repos
    res.render('repolist')
  } 
)

app.post('/repos/byUsername',
  // show repos created by a user send from a form
  async (req,res,next) => {
    const username = req.body.username;
    const repos = 
       await Repo
               .find({username:username})
               .sort({stars:1,forks:1,subscribers:1})
    res.locals.repos = repos
    res.render('repolist')
  }
)

app.use(isLoggedIn)

app.get('/addRepo/:repoId',
  // add a repo to the user's favorite
  async (req,res,next) => {
    try {
      const repoId = req.params.repoId
      const userId = res.locals.user._id
      // check to make sure it's not already loaded
      const lookup = await Saved.find({repoId,userId})
      if (lookup.length==0){
        const saved = new Saved({repoId,userId})
        await saved.save()
      }
      res.redirect('/saved/show')
    } catch(e){
      next(e)
    }
  })

app.get('/saved/show',
  // show the current user's saved
  async (req,res,next) => {
    try{
      const userId = res.locals.user._id;
      const repoIds = 
         (await Saved.find({userId}))
                        .sort(x => x.repo_name)
                        .map(x => x.repoId)
      res.locals.repos = await Repo.find({_id:{$in: repoIds}})
      res.render('saved')
    } catch(e){
      next(e)
    }
  }
)

app.get('/saved/remove/:repoId',
  // remove a repo from the user's saved
  async (req,res,next) => {
    try {
      await Saved.remove(
                {userId:res.locals.user._id,
                 repoId:req.params.repoId})
      res.redirect('/saved/show')

    } catch(e){
      next(e)
    }
  }
)


// here we catch 404 errors and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// this processes any errors generated by the previous routes
// notice that the function has four parameters which is how Express indicates it is an error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render("error");
});


// *********************************************************** //
//  Starting up the server!
// *********************************************************** //
//Here we set the port to use between 1024 and 65535  (2^16-1)
const port = process.env.PORT || "6600";
app.set("port", port);

// and now we startup the server listening on that port
const http = require("http");
const { reset } = require("nodemon");
const server = http.createServer(app);

server.listen(port);

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

server.on("error", onError);

server.on("listening", onListening);

module.exports = app;
