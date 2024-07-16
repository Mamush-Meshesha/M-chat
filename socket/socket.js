const io = require("socket.io")(8000, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

let users = []
const addUser = (userId, socketId, authUser) => {
    const checkUser = users.some(user => user.userId === userId)
    
    if (!checkUser) { 
        users.push({userId, socketId, authUser})
    }
}
io.on("connection", (socket) => {
    console.log("socket connecting")
    socket.on("addUser", (userId, authUser) => {
        addUser(userId, socket.id, authUser)
        io.emit("getUsers", users) 
    })
})