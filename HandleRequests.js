const SDK = require('ringcentral')
const dotenv = require('dotenv')

dotenv.config()

const rcsdk = new SDK({
    server: process.env.RINGCENTRAL_SERVER_URL,
    appKey: process.env.RINGCENTRAL_CLIENT_ID,
    appSecret: process.env.RINGCENTRAL_CLIENT_SECRET
});

const platform = rcsdk.platform();

var http = require('http');
var fs = require('fs');
var url = require('url');

http.createServer(function (req, res) {

    var q = url.parse(req.url, true);
    var pathname = q.pathname;
    var qdata = q.query;
    console.log(pathname);

    if (req.method === "GET") {

        if (pathname === "/") {

            console.log('index.html');
            sendWebpage(req, res);

        } else if (pathname === "/messages") {

            console.log('get messages');
            getMessages(req, res);

        }

    } else if (req.method === "POST") {

        if (pathname === "/messages"){
            if(qdata.from != null && qdata.to != null && qdata.message != null){
                console.log("post messages");
                sendMessages(req, res, qdata.from, qdata.to, qdata.message);
            }
        }else if(pathname === "/calls"){
            if(qdata.from != null && qdata.to != null){
                console.log("post calls");
                makeCall(req, res, qdata.from, qdata.to);
            }
        }
    }

}).listen(8080);


function sendWebpage(req, res) {

    fs.readFile('index.html', function (err, data) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(data);
        res.end();
    });
}

function sendMessages(req, res, from, to, message) {
    var retVal = null;

    platform.login({
        username: process.env.RINGCENTRAL_USERNAME,
        extension: process.env.RINGCENTRAL_EXTENSION,
        password: process.env.RINGCENTRAL_PASSWORD
    }).then(response => {
        platform.post('/account/~/extension/~/sms', {
            from: { phoneNumber: from },
            to: [
                { phoneNumber: to }
            ],
            text: message
        }).then(response => {
            const message = response.json();
            retVal = {
                from: message.from.phoneNumber,
                to: message.to[0].phoneNumber,
                subject: message.subject,
                time: message.creationTime
            };
            res.writeHead(200, { 'Content-Type': 'text/html' });
            console.log('retval ' + retVal);
            res.end(JSON.stringify(retVal));
        }).catch(e => {
            console.error(e)
        })
    }).catch(e => {
        console.error(e)
    })

}

function getMessages(req, res) {

    var retVal = [];
    platform.login({
        username: process.env.RINGCENTRAL_USERNAME,
        extension: process.env.RINGCENTRAL_EXTENSION,
        password: process.env.RINGCENTRAL_PASSWORD
    }).then(response => {
        platform.get('/account/~/extension/~/message-store', { direction: 'Outbound' }).then(response => {
            const messages = response.json().records
            console.log(`We get of a list of ${messages.length} messages`);

            for (var i = 0; i < messages.length; i++) {
                retVal.push({
                    from: messages[i].from.phoneNumber,
                    to: messages[i].to[0].phoneNumber,
                    subject: messages[i].subject,
                    time: messages[i].creationTime
                });
            }
            res.writeHead(200, { "Content-Type": "text/html" });
            res.write(JSON.stringify(retVal));
            res.end();
        })
    }).catch(e => {
        console.error(e)
    });

    return retVal;
}

function makeCall(req, res, from, to) {
    var retVal = null;

    platform.login({
        username: process.env.RINGCENTRAL_USERNAME,
        extension: process.env.RINGCENTRAL_EXTENSION,
        password: process.env.RINGCENTRAL_PASSWORD
    }).then(response => {
        platform.post('/account/~/extension/~/ring-out', {
            from: {
                phoneNumber: from
            },
            to: {
                phoneNumber: to
            },
            callerId: {
                phoneNumber: process.env.RINGCENTRAL_USERNAME
            },
            playPrompt: false,
            country: {
                id: "1"
            }

        }).then(response => {
            const message = response.json();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            console.log(message.status.callStatus);
            res.end(JSON.stringify(message));
        }).catch(e => {
            console.error(e)
        })
    }).catch(e => {
        console.error(e)
    })

}