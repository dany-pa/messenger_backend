const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 7071 });

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
