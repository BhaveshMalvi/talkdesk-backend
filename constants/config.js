const corsOptions = {
  origin:[ "http://localhost:5173", "http://localhost:4173", process.env.CLIENT_URL],
  methods: ["GET", "POST", "PUT","DELETE"],
  credentials:true
}

const PAKAU_TOKEN = "pakau-token"

export {corsOptions, PAKAU_TOKEN}