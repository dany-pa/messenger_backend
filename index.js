const fs = require('fs').promises;

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 7071 });

const http = require("http");
const host = '127.0.0.1';
const port = 8000;
const requestListener = function (req, res) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader('Access-Control-Allow-Origin', '*');
    const url = new URL(req.url, `http://${req.headers.host}`);
    switch (url.pathname) {
        case '/history':
            const usersParam = url.searchParams.get("users") ?? ''
            const users = usersParam.split(',')
            
            res.writeHead(200);

            const dialog = getDialog(users)
            res.end(JSON.stringify(dialog?.messages ?? []));
        break;
        default:
            fs.readFile(__dirname + "/index.html").then(contents => {
                res.setHeader("Content-Type", "text/html");
                res.writeHead(200);
                res.end(contents);
            }).catch(err => {
                res.writeHead(500);
                res.end(err);
                return;
            });
    }
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

function getDialog(users){
    return dialogs.find(dialog => users.every((user)=>dialog.users.includes(Number(user))))
}

function checkClientsStatuses(){
    [...clients.values()].forEach((client)=>{
        const lastEvent = client.lastEvent
        const now = new Date()
        const timeDiff = Math.abs(lastEvent - now)

        // if (timeDiff > 30000){
        //     console.log("offline")
        // } else {
        //     console.log("online")
        // }
    })
}

function sendToAllClients(message, expectID){
    [...clients.values()].forEach((client) => {
        if (client.id === expectID) return
        
        client.ws.send(JSON.stringify(message));
    })
}

const clients = new Map();
const dialogs = [{
    users: [1,2],
    messages: [{from: 1, to: 2, text: "message"}]
}];
let isIntervalStarted = false

wss.on('connection', (ws) => {
    ws.on('message', (messageAsString) => {
        const message = JSON.parse(messageAsString);

        switch(message.type){
            case "hello":
                const id = message.id
                const metadata = clients.get(id) ?? {ws: undefined, id: undefined, messages: [], status: "offline", "lastEvent": new Date("01.01.1995 00:00:00")}

                clients.set(id, {...metadata, ws, id, status: "online", "lastEvent": new Date()});

                ws.send(JSON.stringify({
                    usersStatuses: [...clients.values()].map(client => {
                        return {
                            id: client.id,
                            status: client.status
                        }
                    }),
                    type: "successfulConnection"
                }));

                sendToAllClients({
                    id,
                    status: "online",
                    type: "newUser"
                },id)
            break;
            case "getLastClient":
                ws.send(JSON.stringify({
                    type: "lastClient",
                    id: [...clients.values()][clients.size-1]?.id ?? 0
                }));
            break;
            case "sendMessage":
                const dialog = getDialog([message.from, message.to])
                if (dialog){
                    dialog.messages.push({
                        from: message.from,
                        to: message.to,
                        text: message.text,
                    })
                } else {
                    dialogs.push({
                        users: [message.from, message.to],
                        messages: [{
                            from: message.from,
                            to: message.to,
                            text: message.text,
                        }]
                    })
                }

                clients.get(message.to).ws.send(JSON.stringify({
                    type: "newMessage",
                    from: message.from,
                    to: message.to,
                    text: message.text,
                }))
            break;
        }
        // if (!isIntervalStarted){

        //     setInterval(()=>{
        //         const currentClient = clients.get(1)
        //         const status = currentClient.status === "offline" ? "online" : "offline"
        //         clients.set(1, {...currentClient, status });
        //         [...clients.values()].forEach((client) => {
        //             if (currentClient.id !== client.id){
        //                 client.ws.send(JSON.stringify({
        //                     id: currentClient.id,
        //                     status,
        //                     type: "clientChangeStatus"
        //                 }));
        //             }
        //         })
                
        //     }, 2000)

        //     isIntervalStarted = true
        // }
    })

    ws.on("close", () => {
        clients.delete(ws);
    });

    console.log("wss up");
})


setInterval(()=>{
    checkClientsStatuses()
}, 1000)
