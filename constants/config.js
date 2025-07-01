const corsOptions = {
  origin: [process.env.CLIENT_URL,  
     "https://talkdesk-frontend-git-main-bhaveshmalvis-projects.vercel.app",
  "https://talkdesk-frontend.vercel.app"],
  methods: ["GET", "POST", "PUT","DELETE"],
  credentials:true
}

const PAKAU_TOKEN = "pakau-token"

export {corsOptions, PAKAU_TOKEN}