const corsOptions = {
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT","DELETE"],
  credentials:true
}

const PAKAU_TOKEN = "pakau-token"

export {corsOptions, PAKAU_TOKEN}