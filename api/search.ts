import type {VercelRequest, VercelResponse} from '@vercel/node'
import {handleBeatmapApi} from '../server/vercel.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
    return handleBeatmapApi(req, res)
}