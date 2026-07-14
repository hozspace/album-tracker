import { createApp } from './app.js'
import './db.js'

const PORT = Number(process.env.PORT ?? 4180)

const app = createApp()

app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`)
})
