'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var cors = require('cors');
var dotenv = require('dotenv');
const { parse } = require('querystring');
const dns = require('dns');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use('/public', express.static(process.cwd() + '/public'));

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {useMongoClient: true});

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

let Schema = mongoose.Schema;

let urlSchema = new Schema({
	url: String, 
	shortURL: Number
});

let ShortUrl = mongoose.model('ShortUrl', urlSchema);
let regex = /^https?:\/\//m;

app.post("/api/shorturl/new", function (req, res) { 

	let body = '';
	let urlObj;
	
    
	req.on('data', chunk => {
				console.log(chunk);
        body += chunk.toString(); // convert Buffer to string
	});
	
	req.on('end', () => {
			let url2 = body.replace('%3A%2F%2F', '://');
			urlObj = parse(url2);
			console.log(urlObj.url);
			let newlink = urlObj.url;
			
			if (regex.test(newlink)) {
    		newlink = newlink.split(regex)[1]; // gets rid of http(s):// in entry if it exists so dns.lookup will work
  		}
		
			dns.lookup(newlink, function(err, address, family) {
				if(err) {
					res.json({message: "Sorry, that isn't a valid URL. Try removing 'http://' or 'https://' from the front of your URL if present.", error: err});	
				} else {
					ShortUrl.findOne({url: newlink}, function(err, data) {
						if(data !== null) {
							if(err) throw err;
							res.json(data);						
						} else {			
							if(err) throw err;
							let counter;
							ShortUrl.count({}, function(err, count){  
								if(err) throw err;
								console.log(typeof(count));
								
								let newCount = parseInt(count) + 1;
								let urlNew = new ShortUrl({url: newlink, shortURL: newCount});

								urlNew.save(function(err) {
									if(err) throw err;
									res.json(urlNew);
								});																		
							});
						}
					});				
				}
			}); 	
  });		
});

async function redirect(req, res) {
  let short = req.params.short;
  ShortUrl.findOne({ shortURL: short}, function(err, data) {
		if(err) throw err; 
		if (data !== null) {
    	res.writeHead(302, {'Location': 'http://' + data.url});
			res.end();
  	} else {
			res.send("Sorry, that URL isn't in our database.");
		}
	}); // uses short to find entry
}

app.get("/api/shorturl/:short", redirect);

app.listen(port, function () {
  console.log('Node.js listening ...');
});