
import { NextApiRequest } from 'next'
import { NextApiResponseServerIO } from '@/lib/socket'
import { initSocket } from '@/lib/socket'

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO server...')
    initSocket(res.socket.server)
  }
  res.end()
}